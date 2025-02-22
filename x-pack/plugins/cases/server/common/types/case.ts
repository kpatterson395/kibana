/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObject } from '@kbn/core-saved-objects-server';
import type { CaseAttributes } from '../../../common/api';
import type { ConnectorPersisted } from './connectors';
import type { ExternalServicePersisted } from './external_service';
import type { User, UserProfile } from './user';

export enum CasePersistedSeverity {
  LOW = 0,
  MEDIUM = 10,
  HIGH = 20,
  CRITICAL = 30,
}

export enum CasePersistedStatus {
  OPEN = 0,
  IN_PROGRESS = 10,
  CLOSED = 20,
}

export interface CasePersistedAttributes {
  assignees: UserProfile[];
  closed_at: string | null;
  closed_by: User | null;
  created_at: string;
  created_by: User;
  connector: ConnectorPersisted;
  description: string;
  duration: number | null;
  external_service: ExternalServicePersisted | null;
  owner: string;
  settings: { syncAlerts: boolean };
  severity: CasePersistedSeverity;
  status: CasePersistedStatus;
  tags: string[];
  title: string;
  total_alerts: number;
  total_comments: number;
  updated_at: string | null;
  updated_by: User | null;
}

export type CaseTransformedAttributes = CaseAttributes;

export type CaseSavedObject = SavedObject<CasePersistedAttributes>;
export type CaseSavedObjectTransformed = SavedObject<CaseTransformedAttributes>;
