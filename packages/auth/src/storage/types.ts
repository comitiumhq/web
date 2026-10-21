export type StorageMode = 'setup' | 'unlock' | 'recovery-code' | 'recovery' | 'change' | 'create-recovery-code';

export interface StorageFormValues {
  password: string;
  currentPassword: string;
  recoveryCode: string;
}
