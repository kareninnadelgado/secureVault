#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/03613b8710e762ff74e547423340a4e0d708587b669811ebc6355d3b9ba28c8b/contract';
import endContract from '../../snapshots/03613b8710e762ff74e547423340a4e0d708587b669811ebc6355d3b9ba28c8b/contract.json' with { type: 'json' };
import type { Contract as Start } from '../../snapshots/237ee2c2410b82823fc4a45d496a22f0e78d8f83fa3bdad3430725afcb80062a/contract';
import startContract from '../../snapshots/237ee2c2410b82823fc4a45d496a22f0e78d8f83fa3bdad3430725afcb80062a/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col, fn, lit, rawSql } from '@prisma/orm-postgres/migration';
export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.dropDefault({ schema: 'public', table: 'documents', column: 'updatedAt' }),
      this.dropDefault({ schema: 'public', table: 'users', column: 'updatedAt' }),
      this.addColumn({
        schema: 'public',
        table: 'permissions',
        column: col('createdAt', 'timestamptz', {
          notNull: true,
          default: fn('now()'),
          codecRef: { codecId: 'pg/timestamptz-string@1' },
        }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'refresh_tokens',
        column: col('userAgent', 'text', { codecRef: { codecId: 'pg/text@1' } }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'roles',
        column: col('createdAt', 'timestamptz', {
          notNull: true,
          default: fn('now()'),
          codecRef: { codecId: 'pg/timestamptz-string@1' },
        }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'users',
        column: col('failedLoginAttempts', 'int4', {
          notNull: true,
          default: lit(0),
          codecRef: { codecId: 'pg/int4@1' },
        }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'users',
        column: col('lockedUntil', 'timestamptz', {
          codecRef: { codecId: 'pg/timestamptz-string@1' },
        }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'users',
        column: col('passwordChangedAt', 'timestamptz', {
          codecRef: { codecId: 'pg/timestamptz-string@1' },
        }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'permissions',
        column: col('updatedAt', 'timestamptz', {
          codecRef: { codecId: 'pg/timestamptz-string@1' },
        }),
      }),
      rawSql({
  id: 'backfill-permissions-updatedAt',
  label: 'Backfill permissions.updatedAt',
  operationClass: 'data',
  target: { id: 'postgres' },
  precheck: [
    {
      description: 'Check permissions rows missing updatedAt',
      sql: 'SELECT EXISTS (SELECT 1 FROM "public"."permissions" WHERE "updatedAt" IS NULL) AS ok',
    },
  ],
  execute: [
    {
      description: 'Set permissions.updatedAt from createdAt',
      sql: 'UPDATE "public"."permissions" SET "updatedAt" = "createdAt" WHERE "updatedAt" IS NULL',
    },
  ],
  postcheck: [
    {
      description: 'Verify permissions.updatedAt is populated',
      sql: 'SELECT NOT EXISTS (SELECT 1 FROM "public"."permissions" WHERE "updatedAt" IS NULL) AS ok',
    },
  ],
}),
      this.setNotNull({ schema: 'public', table: 'permissions', column: 'updatedAt' }),
      this.addColumn({
        schema: 'public',
        table: 'refresh_tokens',
        column: col('familyId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
      }),
      rawSql({
  id: 'backfill-refresh_tokens-familyId',
  label: 'Backfill refresh_tokens.familyId',
  operationClass: 'data',
  target: { id: 'postgres' },
  precheck: [
    {
      description: 'Check refresh tokens missing familyId',
      sql: 'SELECT EXISTS (SELECT 1 FROM "public"."refresh_tokens" WHERE "familyId" IS NULL) AS ok',
    },
  ],
  execute: [
    {
      description: 'Initialize each legacy refresh token as its own family',
      sql: 'UPDATE "public"."refresh_tokens" SET "familyId" = "tokenHash" WHERE "familyId" IS NULL',
    },
  ],
  postcheck: [
    {
      description: 'Verify refresh token familyId is populated',
      sql: 'SELECT NOT EXISTS (SELECT 1 FROM "public"."refresh_tokens" WHERE "familyId" IS NULL) AS ok',
    },
  ],
}),
      this.setNotNull({ schema: 'public', table: 'refresh_tokens', column: 'familyId' }),
      this.addColumn({
        schema: 'public',
        table: 'roles',
        column: col('updatedAt', 'timestamptz', {
          codecRef: { codecId: 'pg/timestamptz-string@1' },
        }),
      }),
      rawSql({
  id: 'backfill-roles-updatedAt',
  label: 'Backfill roles.updatedAt',
  operationClass: 'data',
  target: { id: 'postgres' },
  precheck: [
    {
      description: 'Check roles rows missing updatedAt',
      sql: 'SELECT EXISTS (SELECT 1 FROM "public"."roles" WHERE "updatedAt" IS NULL) AS ok',
    },
  ],
  execute: [
    {
      description: 'Set roles.updatedAt from createdAt',
      sql: 'UPDATE "public"."roles" SET "updatedAt" = "createdAt" WHERE "updatedAt" IS NULL',
    },
  ],
  postcheck: [
    {
      description: 'Verify roles.updatedAt is populated',
      sql: 'SELECT NOT EXISTS (SELECT 1 FROM "public"."roles" WHERE "updatedAt" IS NULL) AS ok',
    },
  ],
}),
      this.setNotNull({ schema: 'public', table: 'roles', column: 'updatedAt' }),
      this.createIndex({
        schema: 'public',
        table: 'refresh_tokens',
        index: 'refresh_tokens_familyId_idx_3d03045e',
        columns: ['familyId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'users',
        index: 'users_lockedUntil_idx_87011f1e',
        columns: ['lockedUntil'],
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
