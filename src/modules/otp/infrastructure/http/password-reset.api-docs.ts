import { defineApiDocs } from '@shared/swagger';
import { PasswordResetController } from './password-reset.controller';

defineApiDocs(PasswordResetController, {
  tag: 'Auth',
  operations: {
    requestReset: {
      summary: 'Send a password reset code',
      validation: true,
    },
  },
});
