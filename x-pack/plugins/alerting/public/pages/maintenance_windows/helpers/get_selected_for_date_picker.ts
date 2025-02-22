/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { get } from 'lodash';
import moment, { Moment } from 'moment';
import { FormData } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';

export function getSelectedForDatePicker(form: FormData, path: string): Moment {
  // parse from a string date to moment() if there is an intitial value
  // otherwise just get the current date
  const initialValue = get(form, path);
  let selected = moment();
  if (initialValue && moment(initialValue).isValid()) {
    selected = moment(initialValue);
  }
  return selected;
}
