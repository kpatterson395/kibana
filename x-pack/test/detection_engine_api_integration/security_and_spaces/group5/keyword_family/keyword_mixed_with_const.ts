/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import {
  EqlRuleCreateProps,
  ThresholdRuleCreateProps,
} from '@kbn/security-solution-plugin/common/detection_engine/rule_schema';
import { ALERT_THRESHOLD_RESULT } from '@kbn/security-solution-plugin/common/field_maps/field_names';

import { FtrProviderContext } from '../../../common/ftr_provider_context';
import {
  createRule,
  createSignalsIndex,
  deleteAllRules,
  deleteSignalsIndex,
  getEqlRuleForSignalTesting,
  getRuleForSignalTesting,
  getSignalsById,
  waitForRuleSuccess,
  waitForSignalsToBePresent,
} from '../../../utils';

// eslint-disable-next-line import/no-default-export
export default ({ getService }: FtrProviderContext) => {
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');
  const log = getService('log');

  describe('Rule detects against a keyword and constant_keyword of event.dataset', () => {
    before(async () => {
      await esArchiver.load('x-pack/test/functional/es_archives/rule_keyword_family/const_keyword');
      await esArchiver.load('x-pack/test/functional/es_archives/rule_keyword_family/keyword');
    });

    after(async () => {
      await esArchiver.unload(
        'x-pack/test/functional/es_archives/rule_keyword_family/const_keyword'
      );
      await esArchiver.unload('x-pack/test/functional/es_archives/rule_keyword_family/keyword');
    });

    beforeEach(async () => {
      await createSignalsIndex(supertest, log);
    });

    afterEach(async () => {
      await deleteSignalsIndex(supertest, log);
      await deleteAllRules(supertest, log);
    });

    describe('"kql" rule type', () => {
      it('should detect the "dataset_name_1" from "event.dataset" and have 8 signals, 4 from each index', async () => {
        const rule = {
          ...getRuleForSignalTesting(['keyword', 'const_keyword']),
          query: 'event.dataset: "dataset_name_1"',
        };
        const { id } = await createRule(supertest, log, rule);
        await waitForRuleSuccess({ supertest, log, id });
        await waitForSignalsToBePresent(supertest, log, 8, [id]);
        const signalsOpen = await getSignalsById(supertest, log, id);
        expect(signalsOpen.hits.hits.length).to.eql(8);
      });

      it('should copy the dataset_name_1 from the index into the signal', async () => {
        const rule = {
          ...getRuleForSignalTesting(['keyword', 'const_keyword']),
          query: 'event.dataset: "dataset_name_1"',
        };
        const { id } = await createRule(supertest, log, rule);
        await waitForRuleSuccess({ supertest, log, id });
        await waitForSignalsToBePresent(supertest, log, 8, [id]);
        const signalsOpen = await getSignalsById(supertest, log, id);
        const hits = signalsOpen.hits.hits.map((hit) => hit._source?.['event.dataset']).sort();
        expect(hits).to.eql([
          'dataset_name_1',
          'dataset_name_1',
          'dataset_name_1',
          'dataset_name_1',
          'dataset_name_1',
          'dataset_name_1',
          'dataset_name_1',
          'dataset_name_1',
        ]);
      });
    });

    describe('"eql" rule type', () => {
      it('should detect the "dataset_name_1" from "event.dataset" and have 8 signals, 4 from each index', async () => {
        const rule: EqlRuleCreateProps = {
          ...getEqlRuleForSignalTesting(['keyword', 'const_keyword']),
          query: 'any where event.dataset=="dataset_name_1"',
        };

        const { id } = await createRule(supertest, log, rule);
        await waitForRuleSuccess({ supertest, log, id });
        await waitForSignalsToBePresent(supertest, log, 8, [id]);
        const signalsOpen = await getSignalsById(supertest, log, id);
        expect(signalsOpen.hits.hits.length).to.eql(8);
      });

      it('should copy the "dataset_name_1" from "event.dataset"', async () => {
        const rule: EqlRuleCreateProps = {
          ...getEqlRuleForSignalTesting(['keyword', 'const_keyword']),
          query: 'any where event.dataset=="dataset_name_1"',
        };

        const { id } = await createRule(supertest, log, rule);
        await waitForRuleSuccess({ supertest, log, id });
        await waitForSignalsToBePresent(supertest, log, 8, [id]);
        const signalsOpen = await getSignalsById(supertest, log, id);
        const hits = signalsOpen.hits.hits.map((hit) => hit._source?.['event.dataset']).sort();
        expect(hits).to.eql([
          'dataset_name_1',
          'dataset_name_1',
          'dataset_name_1',
          'dataset_name_1',
          'dataset_name_1',
          'dataset_name_1',
          'dataset_name_1',
          'dataset_name_1',
        ]);
      });
    });

    describe('"threshold" rule type', async () => {
      it('should detect the "dataset_name_1" from "event.dataset"', async () => {
        const rule: ThresholdRuleCreateProps = {
          ...getRuleForSignalTesting(['keyword', 'const_keyword']),
          rule_id: 'threshold-rule',
          type: 'threshold',
          language: 'kuery',
          query: '*:*',
          threshold: {
            field: 'event.dataset',
            value: 1,
          },
        };
        const { id } = await createRule(supertest, log, rule);
        await waitForRuleSuccess({ supertest, log, id });
        await waitForSignalsToBePresent(supertest, log, 1, [id]);
        const signalsOpen = await getSignalsById(supertest, log, id);
        const hits = signalsOpen.hits.hits
          .map((hit) => hit._source?.[ALERT_THRESHOLD_RESULT] ?? null)
          .sort();
        expect(hits).to.eql([
          {
            count: 8,
            from: '2020-10-27T05:00:53.000Z',
            terms: [
              {
                field: 'event.dataset',
                value: 'dataset_name_1',
              },
            ],
          },
        ]);
      });
    });
  });
};
