/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import './_dashboard_app.scss';

import React from 'react';
import { History } from 'history';
import { parse, ParsedQuery } from 'query-string';
import { render, unmountComponentAtNode } from 'react-dom';
import { Switch, RouteComponentProps, HashRouter, Redirect } from 'react-router-dom';
import { Route } from '@kbn/shared-ux-router';

import { I18nProvider } from '@kbn/i18n-react';
import { AppMountParameters, CoreSetup } from '@kbn/core/public';
import { KibanaThemeProvider } from '@kbn/kibana-react-plugin/public';
import { createKbnUrlStateStorage, withNotifyOnErrors } from '@kbn/kibana-utils-plugin/public';

import {
  createDashboardListingFilterUrl,
  CREATE_NEW_DASHBOARD_URL,
  DASHBOARD_APP_ID,
  LANDING_PAGE_PATH,
  VIEW_DASHBOARD_URL,
} from '../dashboard_constants';
import { DashboardApp } from './dashboard_app';
import { pluginServices } from '../services/plugin_services';
import { DashboardNoMatch } from './listing_page/dashboard_no_match';
import { createDashboardEditUrl } from '../dashboard_constants';
import { DashboardStart, DashboardStartDependencies } from '../plugin';
import { DashboardMountContext } from './hooks/dashboard_mount_context';
import { DashboardListingPage } from './listing_page/dashboard_listing_page';
import { dashboardReadonlyBadge, getDashboardPageTitle } from './_dashboard_app_strings';
import { DashboardEmbedSettings, DashboardMountContextProps, RedirectToProps } from './types';

export const dashboardUrlParams = {
  showTopMenu: 'show-top-menu',
  showQueryInput: 'show-query-input',
  showTimeFilter: 'show-time-filter',
  hideFilterBar: 'hide-filter-bar',
};

export interface DashboardMountProps {
  appUnMounted: () => void;
  element: AppMountParameters['element'];
  core: CoreSetup<DashboardStartDependencies, DashboardStart>;
  mountContext: DashboardMountContextProps;
}

export async function mountApp({ core, element, appUnMounted, mountContext }: DashboardMountProps) {
  const {
    chrome: { setBadge, docTitle, setHelpExtension },
    dashboardCapabilities: { showWriteControls },
    documentationLinks: { dashboardDocLink },
    settings: { uiSettings },
    data: dataStart,
    notifications,
    embeddable,
  } = pluginServices.getServices();

  let globalEmbedSettings: DashboardEmbedSettings | undefined;
  let routerHistory: History;

  const getUrlStateStorage = (history: RouteComponentProps['history']) =>
    createKbnUrlStateStorage({
      history,
      useHash: uiSettings.get('state:storeInSessionStorage'),
      ...withNotifyOnErrors(notifications.toasts),
    });

  const redirect = (redirectTo: RedirectToProps) => {
    if (!routerHistory) return;
    const historyFunction = redirectTo.useReplace ? routerHistory.replace : routerHistory.push;
    let destination;
    if (redirectTo.destination === 'dashboard') {
      destination = redirectTo.id
        ? createDashboardEditUrl(redirectTo.id, redirectTo.editMode)
        : CREATE_NEW_DASHBOARD_URL;
    } else {
      destination = createDashboardListingFilterUrl(redirectTo.filter);
    }
    historyFunction(destination);
  };

  const getDashboardEmbedSettings = (
    routeParams: ParsedQuery<string>
  ): DashboardEmbedSettings | undefined => {
    return {
      forceShowTopNavMenu: Boolean(routeParams[dashboardUrlParams.showTopMenu]),
      forceShowQueryInput: Boolean(routeParams[dashboardUrlParams.showQueryInput]),
      forceShowDatePicker: Boolean(routeParams[dashboardUrlParams.showTimeFilter]),
      forceHideFilterBar: Boolean(routeParams[dashboardUrlParams.hideFilterBar]),
    };
  };

  const renderDashboard = (routeProps: RouteComponentProps<{ id?: string }>) => {
    const routeParams = parse(routeProps.history.location.search);
    if (routeParams.embed && !globalEmbedSettings) {
      globalEmbedSettings = getDashboardEmbedSettings(routeParams);
    }
    if (!routerHistory) {
      routerHistory = routeProps.history;
    }
    return (
      <DashboardApp
        history={routeProps.history}
        embedSettings={globalEmbedSettings}
        savedDashboardId={routeProps.match.params.id}
        redirectTo={redirect}
      />
    );
  };

  const renderListingPage = (routeProps: RouteComponentProps) => {
    docTitle.change(getDashboardPageTitle());
    const routeParams = parse(routeProps.history.location.search);
    const title = (routeParams.title as string) || undefined;
    const filter = (routeParams.filter as string) || undefined;
    if (!routerHistory) {
      routerHistory = routeProps.history;
    }
    return (
      <DashboardListingPage
        initialFilter={filter}
        title={title}
        kbnUrlStateStorage={getUrlStateStorage(routeProps.history)}
        redirectTo={redirect}
      />
    );
  };

  const renderNoMatch = (routeProps: RouteComponentProps) => {
    return <DashboardNoMatch history={routeProps.history} />;
  };

  const hasEmbeddableIncoming = Boolean(
    embeddable.getStateTransfer().getIncomingEmbeddablePackage(DASHBOARD_APP_ID, false)
  );
  if (!hasEmbeddableIncoming) {
    dataStart.dataViews.clearCache();
  }

  // dispatch synthetic hash change event to update hash history objects
  // this is necessary because hash updates triggered by using popState won't trigger this event naturally.
  const unlistenParentHistory = mountContext.scopedHistory().listen(() => {
    window.dispatchEvent(new HashChangeEvent('hashchange'));
  });

  const app = (
    <I18nProvider>
      <DashboardMountContext.Provider value={mountContext}>
        <KibanaThemeProvider theme$={core.theme.theme$}>
          <HashRouter>
            <Switch>
              <Route
                path={[CREATE_NEW_DASHBOARD_URL, `${VIEW_DASHBOARD_URL}/:id`]}
                render={renderDashboard}
              />
              <Route exact path={LANDING_PAGE_PATH} render={renderListingPage} />
              <Route exact path="/">
                <Redirect to={LANDING_PAGE_PATH} />
              </Route>
              <Route render={renderNoMatch} />
            </Switch>
          </HashRouter>
        </KibanaThemeProvider>
      </DashboardMountContext.Provider>
    </I18nProvider>
  );

  setHelpExtension({
    appName: getDashboardPageTitle(),
    links: [
      {
        linkType: 'documentation',
        href: `${dashboardDocLink}`,
      },
    ],
  });

  if (!showWriteControls) {
    setBadge({
      text: dashboardReadonlyBadge.getText(),
      tooltip: dashboardReadonlyBadge.getTooltip(),
      iconType: 'glasses',
    });
  }
  render(app, element);
  return () => {
    dataStart.search.session.clear();
    unlistenParentHistory();
    unmountComponentAtNode(element);
    appUnMounted();
  };
}
