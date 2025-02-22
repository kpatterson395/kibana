/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  format as urlFormat,
  parse as urlParse,
  UrlWithParsedQuery,
  UrlWithStringQuery,
} from 'url';
import { ReportingCore } from '../..';
import { TaskPayloadPNG } from '../png/types';
import { TaskPayloadPDF } from '../printable_pdf/types';
import { getAbsoluteUrlFactory } from './get_absolute_url';
import { validateUrls } from './validate_urls';

function isPngJob(job: TaskPayloadPNG | TaskPayloadPDF): job is TaskPayloadPNG {
  return (job as TaskPayloadPNG).relativeUrl !== undefined;
}
function isPdfJob(job: TaskPayloadPNG | TaskPayloadPDF): job is TaskPayloadPDF {
  return (job as TaskPayloadPDF).objects !== undefined;
}

export function getFullUrls(reporting: ReportingCore, job: TaskPayloadPDF | TaskPayloadPNG) {
  const serverInfo = reporting.getServerInfo();
  const {
    kibanaServer: { protocol, hostname, port },
  } = reporting.getConfig();
  const getAbsoluteUrl = getAbsoluteUrlFactory({
    basePath: serverInfo.basePath,
    protocol: protocol ?? serverInfo.protocol,
    hostname: hostname ?? serverInfo.hostname,
    port: port ?? serverInfo.port,
  });

  // PDF and PNG job params put in the url differently
  let relativeUrls: string[] = [];

  if (isPngJob(job)) {
    relativeUrls = [job.relativeUrl];
  } else if (isPdfJob(job)) {
    relativeUrls = job.objects.map((obj) => obj.relativeUrl);
  } else {
    throw new Error(
      `No valid URL fields found in Job Params! Expected \`job.relativeUrl\` or \`job.objects[{ relativeUrl }]\``
    );
  }

  validateUrls(relativeUrls);

  const urls = relativeUrls.map((relativeUrl) => {
    const parsedRelative: UrlWithStringQuery = urlParse(relativeUrl); // FIXME: '(urlStr: string): UrlWithStringQuery' is deprecated
    const jobUrl = getAbsoluteUrl({
      path: parsedRelative.pathname === null ? undefined : parsedRelative.pathname,
      hash: parsedRelative.hash === null ? undefined : parsedRelative.hash,
      search: parsedRelative.search === null ? undefined : parsedRelative.search,
    });

    // capture the route to the visualization
    const parsed: UrlWithParsedQuery = urlParse(jobUrl, true);
    if (parsed.hash == null) {
      throw new Error(
        'No valid hash in the URL! A hash is expected for the application to route to the intended visualization.'
      );
    }

    // allow the hash check to perform first
    if (!job.forceNow) {
      return jobUrl;
    }

    const visualizationRoute: UrlWithParsedQuery = urlParse(parsed.hash.replace(/^#/, ''), true);

    // combine the visualization route and forceNow parameter into a URL
    const transformedHash = urlFormat({
      pathname: visualizationRoute.pathname,
      query: {
        ...visualizationRoute.query,
        forceNow: job.forceNow,
      },
    });

    return urlFormat({
      ...parsed,
      hash: transformedHash,
    });
  });

  return urls;
}
