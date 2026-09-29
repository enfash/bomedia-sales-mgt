begin;
-- Read-only close state per date for the Cash day strip: final, review, open (activity but not
-- finalized) or none. Same business scope and seven-day staff window as cash_day_summary; the
-- review rule matches cash_day_summary's needsReview exactly.
create function public.cash_day_states(end_date date,day_count integer default 7) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare business uuid:=private.active_business(); today date:=(now() at time zone 'Africa/Lagos')::date;
 first_day date; last_day date; d date; figures jsonb; closing public.cash_day_closes%rowtype; state text; result jsonb:='[]';
begin
 if business is null then raise exception 'Active account required' using errcode='42501'; end if;
 if end_date is null or day_count is null or day_count not between 1 and 31 then raise exception 'Invalid date range'; end if;
 last_day:=least(end_date,today); first_day:=last_day-day_count+1;
 if not coalesce(private.is_admin(),false) then first_day:=greatest(first_day,today-6); end if;
 d:=first_day;
 while d<=last_day loop
  select c.* into closing from public.cash_day_closes c where c.business_id=business and c.business_date=d and c.reopened_at is null;
  if found then
   figures:=private.cash_day_figures(business,d);
   state:=case when (figures->>'receiptCount')::bigint+(figures->>'outflowCount')::bigint
      >(closing.snapshot->>'receiptCount')::bigint+(closing.snapshot->>'outflowCount')::bigint
    or coalesce((figures->>'expectedCashKobo')::bigint-(closing.snapshot->>'expectedCashKobo')::bigint,0)<>0
    then 'review' else 'final' end;
  elsif exists(select 1 from public.cash_days x where x.business_id=business and x.business_date=d)
   or exists(select 1 from public.cash_counts x where x.business_id=business and x.business_date=d)
   or exists(select 1 from public.cash_outflows x where x.business_id=business and x.business_date=d)
   or exists(select 1 from public.payments x where x.business_id=business and x.business_date=d) then state:='open';
  else state:='none';
  end if;
  result:=result||jsonb_build_array(jsonb_build_object('date',d,'state',state));
  d:=d+1;
 end loop;
 return result;
end $$;
revoke all on function public.cash_day_states(date,integer) from public,anon;
grant execute on function public.cash_day_states(date,integer) to authenticated;
commit;
