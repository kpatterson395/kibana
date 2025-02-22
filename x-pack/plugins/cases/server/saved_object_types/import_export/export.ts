/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  CoreSetup,
  Logger,
  SavedObject,
  SavedObjectsClientContract,
  SavedObjectsExportTransformContext,
} from '@kbn/core/server';
import type {
  CaseUserActionAttributesWithoutConnectorId,
  CommentAttributesWithoutRefs,
} from '../../../common/api';
import {
  CASE_COMMENT_SAVED_OBJECT,
  CASE_SAVED_OBJECT,
  CASE_USER_ACTION_SAVED_OBJECT,
  MAX_DOCS_PER_PAGE,
  SAVED_OBJECT_TYPES,
} from '../../../common/constants';
import { defaultSortField } from '../../common/utils';
import { createCaseError } from '../../common/error';
import type { CasePersistedAttributes } from '../../common/types/case';

export async function handleExport({
  context,
  objects,
  coreSetup,
  logger,
}: {
  context: SavedObjectsExportTransformContext;
  objects: Array<SavedObject<CasePersistedAttributes>>;
  coreSetup: CoreSetup;
  logger: Logger;
}): Promise<
  Array<
    SavedObject<
      | CasePersistedAttributes
      | CommentAttributesWithoutRefs
      | CaseUserActionAttributesWithoutConnectorId
    >
  >
> {
  try {
    if (objects.length <= 0) {
      return [];
    }

    const [{ savedObjects }] = await coreSetup.getStartServices();
    const savedObjectsClient = savedObjects.getScopedClient(context.request, {
      includedHiddenTypes: SAVED_OBJECT_TYPES,
    });

    const caseIds = objects.map((caseObject) => caseObject.id);
    const attachmentsAndUserActionsForCases = await getAttachmentsAndUserActionsForCases(
      savedObjectsClient,
      caseIds
    );

    return [...objects, ...attachmentsAndUserActionsForCases.flat()];
  } catch (error) {
    throw createCaseError({
      message: `Failed to retrieve associated objects for exporting of cases: ${error}`,
      error,
      logger,
    });
  }
}

async function getAttachmentsAndUserActionsForCases(
  savedObjectsClient: SavedObjectsClientContract,
  caseIds: string[]
): Promise<
  Array<SavedObject<CommentAttributesWithoutRefs | CaseUserActionAttributesWithoutConnectorId>>
> {
  const [attachments, userActions] = await Promise.all([
    getAssociatedObjects<CommentAttributesWithoutRefs>({
      savedObjectsClient,
      caseIds,
      sortField: defaultSortField,
      type: CASE_COMMENT_SAVED_OBJECT,
    }),
    getAssociatedObjects<CaseUserActionAttributesWithoutConnectorId>({
      savedObjectsClient,
      caseIds,
      sortField: defaultSortField,
      type: CASE_USER_ACTION_SAVED_OBJECT,
    }),
  ]);

  return [...attachments, ...userActions];
}

async function getAssociatedObjects<T>({
  savedObjectsClient,
  caseIds,
  sortField,
  type,
}: {
  savedObjectsClient: SavedObjectsClientContract;
  caseIds: string[];
  sortField: string;
  type: string;
}): Promise<Array<SavedObject<T>>> {
  const references = caseIds.map((id) => ({ type: CASE_SAVED_OBJECT, id }));

  const finder = savedObjectsClient.createPointInTimeFinder<T>({
    type,
    hasReferenceOperator: 'OR',
    hasReference: references,
    perPage: MAX_DOCS_PER_PAGE,
    sortField,
    sortOrder: 'asc',
  });

  let result: Array<SavedObject<T>> = [];
  for await (const findResults of finder.find()) {
    result = result.concat(findResults.saved_objects);
  }

  return result;
}
