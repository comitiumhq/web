export type StorageMode = 'setup' | 'unlock' | 'recovery' | 'change' | 'reset' | 'device-recovery' | 'rotate-recovery';

export interface StorageFormValues {
  password: string;
  currentPassword: string;
  recoveryCode: string;
  rememberDevice: boolean;
}
