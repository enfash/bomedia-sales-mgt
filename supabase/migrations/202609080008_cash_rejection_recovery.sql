begin;
-- Serialize recovery with the original writer. A terminal rejection reserves the
-- same operation ID permanently, so an older client cannot later save it.
create function public.process_cash_entry(operation_id uuid,payload jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare actor public.profiles%rowtype; prior private.cash_operations%rowtype; result jsonb; failure text;
begin
 select * into actor from public.profiles where id=auth.uid() and active for share;
 if not found then raise exception 'Active account required' using errcode='42501'; end if;
 if operation_id is null or payload is null or jsonb_typeof(payload)<>'object' then raise exception 'Invalid cash request';end if;
 perform pg_advisory_xact_lock(hashtextextended('cash:'||actor.business_id::text||operation_id::text,0));
 select * into prior from private.cash_operations o where o.business_id=actor.business_id and o.operation_id=process_cash_entry.operation_id;
 if found then
  if prior.actor_id<>actor.id or prior.payload<>payload then raise exception 'Entry ID belongs to another request';end if;
  return prior.result;
 end if;
 begin
  return public.record_cash_entry(operation_id,payload);
 exception when sqlstate 'P0001' or sqlstate '22P02' or sqlstate '22007' or sqlstate '22008' then
  -- The nested transaction has rolled back every financial write before we
  -- record rejection. Transport, permission and unexpected database failures
  -- escape without creating a terminal result.
  get stacked diagnostics failure=message_text;
 end;
 result:=jsonb_build_object('status','rejected','operationId',operation_id,'message',
  case when failure like 'Opening cash already recorded%' then 'Opening cash is already recorded for this day. This extra opening was not recorded.'
       when failure='Opening cash must be recorded for today' then 'This opening is for a previous day and was not recorded. Ask admin to review the day.'
       else 'This entry was not recorded because its details were rejected. Review the details with admin before making a new entry.' end,
  'resolvedAt',now());
 insert into private.cash_operations values(actor.business_id,operation_id,actor.id,payload,result,now());
 insert into public.audit_events(business_id,actor_id,action,record_id,detail)
 values(actor.business_id,actor.id,'cash_entry_rejected',operation_id,jsonb_build_object('result',result));
 return result;
end $$;
revoke all on function public.process_cash_entry(uuid,jsonb) from public,anon;
grant execute on function public.process_cash_entry(uuid,jsonb) to authenticated;
commit;
