import { openDatabaseAsync } from 'expo-sqlite';
import { localSchema } from './schema';
import { localRepository } from './repository';

export async function openLocalRepository(accountId: string) {
  const db = await openDatabaseAsync('bomedia-v1.db');
  const version = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  if ((version?.user_version ?? 0) > 1) throw new Error('This local database requires a newer app.');
  await db.execAsync(localSchema);
  return localRepository(db, accountId);
}
