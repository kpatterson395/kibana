/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { memo, useCallback, useMemo } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiFilterGroup, EuiSuperUpdateButton } from '@elastic/eui';
import type {
  DurationRange,
  OnRefreshChangeProps,
} from '@elastic/eui/src/components/date_picker/types';
import { useIsExperimentalFeatureEnabled } from '../../../../common/hooks/use_experimental_features';
import { ActionsLogWithRuleToggle } from './actions_log_with_rule_toggle';
import type { useGetEndpointActionList } from '../../../hooks';
import {
  type DateRangePickerValues,
  ActionLogDateRangePicker,
} from './actions_log_date_range_picker';
import { ActionsLogFilter } from './actions_log_filter';
import { ActionsLogUsersFilter } from './actions_log_users_filter';
import { useTestIdGenerator } from '../../../hooks/use_test_id_generator';

export const ActionsLogFilters = memo(
  ({
    dateRangePickerState,
    isDataLoading,
    isFlyout,
    onClick,
    onChangeHostsFilter,
    onChangeCommandsFilter,
    onChangeStatusesFilter,
    onChangeUsersFilter,
    onRefresh,
    onRefreshChange,
    onTimeChange,
    showHostsFilter,
    'data-test-subj': dataTestSubj,
  }: {
    dateRangePickerState: DateRangePickerValues;
    isDataLoading: boolean;
    isFlyout: boolean;
    onChangeHostsFilter: (selectedCommands: string[]) => void;
    onChangeCommandsFilter: (selectedCommands: string[]) => void;
    onChangeStatusesFilter: (selectedStatuses: string[]) => void;
    onChangeUsersFilter: (selectedUsers: string[]) => void;
    onRefresh: () => void;
    onRefreshChange: (evt: OnRefreshChangeProps) => void;
    onTimeChange: ({ start, end }: DurationRange) => void;
    onClick: ReturnType<typeof useGetEndpointActionList>['refetch'];
    showHostsFilter: boolean;
    'data-test-subj'?: string;
  }) => {
    const getTestId = useTestIdGenerator(dataTestSubj);
    const responseActionsEnabled = useIsExperimentalFeatureEnabled(
      'endpointResponseActionsEnabled'
    );
    const filters = useMemo(() => {
      return (
        <>
          {showHostsFilter && (
            <ActionsLogFilter
              filterName={'hosts'}
              isFlyout={isFlyout}
              onChangeFilterOptions={onChangeHostsFilter}
              data-test-subj={dataTestSubj}
            />
          )}
          <ActionsLogFilter
            filterName={'actions'}
            isFlyout={isFlyout}
            onChangeFilterOptions={onChangeCommandsFilter}
            data-test-subj={dataTestSubj}
          />
          <ActionsLogFilter
            filterName={'statuses'}
            isFlyout={isFlyout}
            onChangeFilterOptions={onChangeStatusesFilter}
            data-test-subj={dataTestSubj}
          />
          {responseActionsEnabled && (
            <ActionsLogWithRuleToggle dataTestSubj={dataTestSubj} isFlyout={isFlyout} />
          )}
        </>
      );
    }, [
      dataTestSubj,
      isFlyout,
      onChangeCommandsFilter,
      onChangeHostsFilter,
      onChangeStatusesFilter,
      responseActionsEnabled,
      showHostsFilter,
    ]);

    const onClickRefreshButton = useCallback(() => onClick(), [onClick]);

    return (
      <EuiFlexGroup responsive gutterSize="s">
        <EuiFlexItem grow={isFlyout ? 1 : 2}>
          <ActionsLogUsersFilter
            isFlyout={isFlyout}
            onChangeUsersFilter={onChangeUsersFilter}
            data-test-subj={dataTestSubj}
          />
        </EuiFlexItem>
        <EuiFlexItem grow={isFlyout ? 1 : 1}>
          <EuiFilterGroup>{filters}</EuiFilterGroup>
        </EuiFlexItem>
        <EuiFlexItem grow={isFlyout ? 1 : 2}>
          <ActionLogDateRangePicker
            dateRangePickerState={dateRangePickerState}
            isDataLoading={isDataLoading}
            isFlyout={isFlyout}
            onRefresh={onRefresh}
            onRefreshChange={onRefreshChange}
            onTimeChange={onTimeChange}
            data-test-subj={dataTestSubj}
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiSuperUpdateButton
            iconOnly
            data-test-subj={getTestId('super-refresh-button')}
            fill={false}
            isLoading={isDataLoading}
            onClick={onClickRefreshButton}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }
);

ActionsLogFilters.displayName = 'ActionsLogFilters';
