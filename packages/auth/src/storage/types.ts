export type StorageMode = 'setup' | 'unlock' | 'recovery-code' | 'recovery' | 'change' | 'recovery-kit';

export interface StorageFormValues {
  password: string;
  currentPassword: string;
  recoveryCode: string;
}
