import { v7 as uuidV7 } from 'uuid';

export function generateDatabaseId(): string {
  return uuidV7();
}
