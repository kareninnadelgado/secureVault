import bcrypt from 'bcrypt';
import { PASSWORD_BCRYPT_ROUNDS } from '../utils/security.constants.js';

export async function hashPassword(password) {
  return bcrypt.hash(password, PASSWORD_BCRYPT_ROUNDS);
}

export async function comparePassword(password, passwordHash) {
  return bcrypt.compare(password, passwordHash);
}