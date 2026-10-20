export type StorageMode = 'setup' | 'unlock' | 'recovery' | 'change' | 'recovery-kit';

export interface StorageFormValues {
  password: string;
  currentPassword: string;
  recoveryCode: string;
}
