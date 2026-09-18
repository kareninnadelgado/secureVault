import 'dotenv/config';
import readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';

import { db } from '../src/prisma/db.ts';
import { hashPassword } from '../src/services/password.service.js';
import { ROLES } from '../src/utils/roles.js';

const rl = readline.createInterface({
  input,
  output,
});

async function askHidden(question) {
  return new Promise((resolve) => {
    process.stdout.write(question);

    let value = '';

    input.setRawMode(true);
    input.resume();

    const onData = (chunk) => {
      const char = chunk.toString();

      if (char === '\r' || char === '\n') {
        input.setRawMode(false);
        input.pause();
        input.removeListener('data', onData);
        process.stdout.write('\n');
        resolve(value);
        return;
      }

      if (char === '\u0003') {
        process.exit(1);
      }

      if (char === '\u007f') {
        if (value.length > 0) {
          value = value.slice(0, -1);
        }
        return;
      }

      value += char;
    };

    input.on('data', onData);
  });
}

async function bootstrapAdmin() {
  try {
    console.log('\nSecureVault — Initial Admin Setup\n');

    const username = (await rl.question('Username: ')).trim();
    const email = (await rl.question('Email: ')).trim();
    const firstName = (await rl.question('First name: ')).trim();
    const lastName = (await rl.question('Last name: ')).trim();

    const password = await askHidden('Password: ');
    const passwordConfirmation = await askHidden(
      'Confirm password: '
    );

    if (password !== passwordConfirmation) {
      throw new Error('Passwords do not match.');
    }

    if (password.length < 8) {
      throw new Error('Password must contain at least 8 characters.');
    }

    if (Buffer.byteLength(password, 'utf8') > 72) {
      throw new Error('Password must not exceed 72 bytes.');
    }

    const existingUser = await db.orm.public.User
      .where({ username })
      .first();

    if (existingUser) {
      throw new Error('That username already exists.');
    }

    const existingEmail = await db.orm.public.User
      .where({ email })
      .first();

    if (existingEmail) {
      throw new Error('That email already exists.');
    }

    const passwordHash = await hashPassword(password);

    const result = await db.transaction(async (tx) => {
      let role = await tx.orm.public.Role
        .where({ name: ROLES.ADMIN })
        .first();

      if (!role) {
        role = await tx.orm.public.Role.create({
          name: ROLES.ADMIN,
          description: 'System administrator',
        });
      }

      const user = await tx.orm.public.User.create({
        username,
        email,
        passwordHash,
        firstName,
        lastName,
        roleId: role.id,
        isActive: true,
      });

      return {
        userId: user.id,
        roleId: role.id,
      };
    });

    console.log('\nAdmin created successfully.');
    console.log(`User ID: ${result.userId}`);
    console.log(`Role ID: ${result.roleId}`);
  } catch (error) {
    console.error('\nAdmin setup failed:', error.message);
    process.exitCode = 1;
  } finally {
    rl.close();
  }
}

await bootstrapAdmin();