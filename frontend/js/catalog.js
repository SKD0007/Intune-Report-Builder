/* Copyright 2026 Orynr LLC. Developed by SKDOSS.
   Licensed under the Apache License, Version 2.0 (see LICENSE and NOTICE).
   SPDX-License-Identifier: Apache-2.0 */
/* Report catalog: data sources, ready-made reports, friendly column names and
   value translations. Edit this file to add or tweak built-in reports. */
(function () {
  // Generated from Microsoft Graph's schema by tools/gen_catalog.py (catalog-all.js).
  const EXTRA = window.CATALOG_EXTRA || { sources: [], fields: {} };
  const F = EXTRA.fields || {};
  const DEVICE_FIELDS_MIN = [
    'id', 'deviceName', 'userDisplayName', 'userPrincipalName', 'emailAddress', 'operatingSystem', 'osVersion',
    'complianceState', 'lastSyncDateTime', 'enrolledDateTime', 'manufacturer', 'model', 'serialNumber',
    'managedDeviceOwnerType', 'isEncrypted', 'deviceEnrollmentType', 'managementAgent', 'azureADDeviceId',
    'deviceCategoryDisplayName', 'totalStorageSpaceInBytes', 'freeStorageSpaceInBytes', 'wiFiMacAddress',
    'ethernetMacAddress', 'imei', 'phoneNumber', 'jailBroken', 'isSupervised', 'autopilotEnrolled', 'joinType',
    'skuFamily', 'enrollmentProfileName', 'physicalMemoryInBytes'
  ];
  const DEVICE_FIELDS = F.managedDevice && F.managedDevice.length ? F.managedDevice : DEVICE_FIELDS_MIN;
  const sel = (list, fallback) => (list && list.length ? list : fallback).join(',');

  const P = {
    devices: 'DeviceManagementManagedDevices.Read.All',
    config: 'DeviceManagementConfiguration.Read.All',
    apps: 'DeviceManagementApps.Read.All',
    service: 'DeviceManagementServiceConfig.Read.All',
    users: 'User.Read.All',
    groups: 'Group.Read.All',
    entraDevices: 'Device.Read.All',
    org: 'Organization.Read.All',
    bitlocker: 'BitLockerKey.ReadBasic.All',
    laps: 'DeviceLocalCredential.ReadBasic.All',
    rbac: 'DeviceManagementRBAC.Read.All',
    cloudpc: 'CloudPC.Read.All',
    apps365: 'Application.Read.All',
    policy: 'Policy.Read.All',
    audit: 'AuditLog.Read.All',
    roles: 'RoleManagement.Read.Directory',
    health: 'ServiceHealth.Read.All',
    messages: 'ServiceMessage.Read.All',
    secscore: 'SecurityEvents.Read.All',
    alerts: 'SecurityAlert.Read.All',
    incidents: 'SecurityIncident.Read.All',
    risky: 'IdentityRiskyUser.Read.All',
    riskEvents: 'IdentityRiskEvent.Read.All',
    directory: 'Directory.Read.All'
  };

  // What each permission unlocks (shown on the Settings page).
  const PERMISSIONS = [
    { name: P.devices, unlocks: 'Managed devices, discovered apps, malware' },
    { name: P.config, unlocks: 'Compliance & configuration policies and their assignments, scripts, encryption' },
    { name: P.apps, unlocks: 'Apps, app assignments, supersedence & dependencies, app protection, Intune audit log' },
    { name: P.service, unlocks: 'Autopilot, enrollment settings, connectors & Apple tokens' },
    { name: P.users, unlocks: 'Users' },
    { name: P.groups, unlocks: 'Groups, plus group names and member counts in assignment reports' },
    { name: P.entraDevices, unlocks: 'Entra ID devices' },
    { name: P.org, unlocks: 'Licenses' },
    { name: P.bitlocker, unlocks: 'Which devices have a BitLocker recovery key saved (never the key itself)', optional: true },
    { name: P.laps, unlocks: 'Which devices have a LAPS password backed up (never the password itself)', optional: true },
    { name: P.rbac, unlocks: 'Intune roles, role assignments and scope tags', optional: true },
    { name: P.cloudpc, unlocks: 'Windows 365 Cloud PCs, provisioning and connections', optional: true },
    { name: P.apps365, unlocks: 'App registrations and enterprise apps, including secret and certificate expiry', optional: true },
    { name: P.policy, unlocks: 'Conditional Access, named locations, authentication methods and tenant policies', optional: true },
    { name: P.audit, unlocks: 'Sign-in activity, MFA registration, sign-in and Entra audit logs (some need Entra ID P1)', optional: true },
    { name: P.roles, unlocks: 'Entra ID admin roles, who holds them, and eligible (PIM) roles', optional: true },
    { name: P.health, unlocks: 'Microsoft 365 service health and incidents', optional: true },
    { name: P.messages, unlocks: 'Microsoft 365 message center', optional: true },
    { name: P.secscore, unlocks: 'Microsoft Secure Score and improvement actions', optional: true },
    { name: P.alerts, unlocks: 'Microsoft Defender XDR alerts', optional: true },
    { name: P.incidents, unlocks: 'Microsoft Defender XDR incidents', optional: true },
    { name: P.risky, unlocks: 'Risky users (Entra ID P2)', optional: true },
    { name: P.riskEvents, unlocks: 'Risk detections (Entra ID P2)', optional: true },
    { name: P.directory, unlocks: 'Domains, administrative units, consents, deleted items (covers User/Group/Device read too)', optional: true }
  ];

  // Where data comes from. `permission` may be a list: any one of them is enough.
  const SOURCES = {
    // ---- Combined reports, built on the server from several Graph calls ("view:<name>").
    assignments: {
      name: 'Assignments (everything)', icon: 'target', permission: [P.apps, P.config, P.service],
      description: 'Every app, policy, profile and script with who it is assigned to: groups, include/exclude, filters and member counts.',
      path: 'view:assignments',
      columns: ['itemType', 'itemName', 'platform', 'intent', 'targetMode', 'target', 'deviceMembers', 'userMembers', 'filterName', 'filterMode']
    },
    appDetails: {
      name: 'App details', icon: 'apps', permission: P.apps,
      description: 'Every Intune app with its version, install command, detection rules and assignment counts.',
      path: 'view:appDetails',
      columns: ['displayName', '@odata.type', 'appVersion', 'publisher', 'installContext', 'requiredTargets', 'availableTargets', 'uninstallTargets', 'lastModifiedDateTime']
    },
    appRelationships: {
      name: 'App supersedence & dependencies', icon: 'apps', permission: P.apps,
      description: 'Which apps replace or depend on other apps, with their detection rules.',
      path: 'view:appRelationships',
      columns: ['relationship', 'sourceApp', 'sourceVersion', 'how', 'targetApp', 'targetVersion', 'atRisk', 'detectionOverlap']
    },
    connectors: {
      name: 'Connectors & tokens', icon: 'plug', permission: P.service,
      description: 'Apple push certificate, Apple enrollment and VPP tokens, Managed Google Play and other connectors: expiry and last sync.',
      path: 'view:connectors',
      columns: ['connector', 'name', 'health', 'expires', 'daysLeft', 'lastSync', 'status', 'detail']
    },
    windowsRecovery: {
      name: 'BitLocker & LAPS backup', icon: 'key', permission: [P.bitlocker, P.laps],
      description: 'Windows devices and whether their BitLocker recovery key and LAPS password are backed up to Entra ID.',
      path: 'view:windowsRecovery',
      columns: ['deviceName', 'userPrincipalName', 'isEncrypted', 'bitlockerKey', 'lastKeyBackup', 'lapsPassword', 'lapsLastBackup', 'lastSyncDateTime']
    },
    autopilotEntra: {
      name: 'Autopilot devices vs Entra ID', icon: 'rocket', permission: P.service,
      description: 'Autopilot devices checked against their Entra ID device object.',
      path: 'view:autopilotEntra',
      columns: ['serialNumber', 'model', 'groupTag', 'entraStatus', 'entraDeviceName', 'enrollmentState', 'intuneEnrolled', 'lastContactedDateTime']
    },
    devices: {
      name: 'Intune managed devices', icon: 'device', permission: P.devices,
      description: 'Every device enrolled in Intune: owner, OS, compliance, hardware.',
      path: '/deviceManagement/managedDevices?$select=' + DEVICE_FIELDS.join(','),
      columns: ['deviceName', 'userDisplayName', 'operatingSystem', 'osVersion', 'complianceState', 'lastSyncDateTime', 'model', 'serialNumber']
    },
    entraDevices: {
      name: 'Entra ID devices', icon: 'device', permission: P.entraDevices,
      description: 'All devices registered or joined in Entra ID (Azure AD).',
      path: '/devices?$select=' + sel(F.device, ['id', 'displayName', 'operatingSystem', 'operatingSystemVersion', 'trustType', 'accountEnabled', 'isCompliant', 'isManaged', 'approximateLastSignInDateTime', 'registrationDateTime', 'manufacturer', 'model', 'deviceId']),
      columns: ['displayName', 'operatingSystem', 'operatingSystemVersion', 'trustType', 'isManaged', 'isCompliant', 'approximateLastSignInDateTime']
    },
    detectedApps: {
      name: 'Discovered apps', icon: 'apps', permission: P.devices,
      description: 'Software found installed on managed devices.',
      path: '/deviceManagement/detectedApps',
      columns: ['displayName', 'version', 'publisher', 'platform', 'deviceCount']
    },
    mobileApps: {
      name: 'Intune apps', icon: 'apps', permission: P.apps,
      description: 'Apps added to Intune for deployment.',
      path: '/deviceAppManagement/mobileApps',
      columns: ['displayName', '@odata.type', 'publisher', 'isAssigned', 'lastModifiedDateTime']
    },
    appProtection: {
      name: 'App protection policies', icon: 'shield', permission: P.apps,
      description: 'MAM / app protection policies for iOS, Android and Windows.',
      path: '/deviceAppManagement/managedAppPolicies',
      columns: ['displayName', '@odata.type', 'description', 'lastModifiedDateTime']
    },
    compliancePolicies: {
      name: 'Compliance policies', icon: 'shield', permission: P.config,
      description: 'Device compliance policies.',
      path: '/deviceManagement/deviceCompliancePolicies',
      columns: ['displayName', '@odata.type', 'description', 'createdDateTime', 'lastModifiedDateTime']
    },
    complianceSettings: {
      name: 'Compliance setting results', icon: 'shield', permission: P.config,
      description: 'For each compliance setting: how many devices pass or fail.',
      path: '/deviceManagement/deviceCompliancePolicySettingStateSummaries',
      columns: ['settingName', 'platformType', 'nonCompliantDeviceCount', 'errorDeviceCount', 'compliantDeviceCount', 'unknownDeviceCount']
    },
    encryption: {
      name: 'Encryption report', icon: 'lock', permission: P.config,
      description: 'BitLocker / FileVault encryption and readiness per device.',
      path: '/deviceManagement/managedDeviceEncryptionStates',
      columns: ['deviceName', 'userPrincipalName', 'deviceType', 'osVersion', 'encryptionState', 'encryptionReadinessState', 'tpmSpecificationVersion']
    },
    malware: {
      name: 'Malware detections', icon: 'alert', permission: P.devices,
      description: 'Threats reported by Microsoft Defender on managed Windows devices.',
      path: '/deviceManagement/windowsMalwareInformation',
      columns: ['displayName', 'severity', 'category', 'lastDetectionDateTime']
    },
    configProfiles: {
      name: 'Configuration profiles', icon: 'sliders', permission: P.config,
      description: 'Device configuration profiles (templates).',
      path: '/deviceManagement/deviceConfigurations',
      columns: ['displayName', '@odata.type', 'description', 'lastModifiedDateTime']
    },
    settingsCatalog: {
      name: 'Settings catalog policies', icon: 'sliders', permission: P.config,
      description: 'Policies built with the settings catalog.',
      path: '/deviceManagement/configurationPolicies',
      columns: ['name', 'platforms', 'technologies', 'settingCount', 'isAssigned', 'lastModifiedDateTime']
    },
    adminTemplates: {
      name: 'Administrative templates', icon: 'sliders', permission: P.config,
      description: 'Group Policy-style (ADMX) configuration profiles.',
      path: '/deviceManagement/groupPolicyConfigurations',
      columns: ['displayName', 'description', 'createdDateTime', 'lastModifiedDateTime']
    },
    scripts: {
      name: 'PowerShell scripts', icon: 'code', permission: [P.config, 'DeviceManagementScripts.Read.All'],
      description: 'Platform scripts pushed to Windows devices.',
      path: '/deviceManagement/deviceManagementScripts',
      columns: ['displayName', 'fileName', 'runAsAccount', 'description', 'lastModifiedDateTime']
    },
    remediations: {
      name: 'Remediations', icon: 'code', permission: [P.config, 'DeviceManagementScripts.Read.All'],
      description: 'Detection & remediation script packages.',
      path: '/deviceManagement/deviceHealthScripts',
      columns: ['displayName', 'publisher', 'description', 'runAsAccount', 'lastModifiedDateTime']
    },
    autopilot: {
      name: 'Autopilot devices', icon: 'rocket', permission: P.service,
      description: 'Hardware registered for Windows Autopilot.',
      path: '/deviceManagement/windowsAutopilotDeviceIdentities',
      columns: ['serialNumber', 'manufacturer', 'model', 'groupTag', 'enrollmentState', 'deploymentProfileAssignmentStatus', 'lastContactedDateTime']
    },
    autopilotProfiles: {
      name: 'Autopilot profiles', icon: 'rocket', permission: P.service,
      description: 'Windows Autopilot deployment profiles.',
      path: '/deviceManagement/windowsAutopilotDeploymentProfiles',
      columns: ['displayName', '@odata.type', 'description', 'deviceNameTemplate', 'lastModifiedDateTime']
    },
    enrollmentConfigs: {
      name: 'Enrollment restrictions & settings', icon: 'rocket', permission: P.service,
      description: 'Enrollment restrictions, limits, Windows Hello and ESP settings.',
      path: '/deviceManagement/deviceEnrollmentConfigurations',
      columns: ['displayName', '@odata.type', 'priority', 'description', 'lastModifiedDateTime']
    },
    users: {
      name: 'Users', icon: 'users', permission: [P.users, 'Directory.Read.All'],
      description: 'All user accounts in Entra ID.',
      path: '/users?$select=' + sel(F.user, ['id', 'displayName', 'userPrincipalName', 'mail', 'jobTitle', 'department', 'officeLocation', 'accountEnabled', 'userType', 'createdDateTime', 'usageLocation']),
      columns: ['displayName', 'userPrincipalName', 'jobTitle', 'department', 'accountEnabled', 'userType']
    },
    groups: {
      name: 'Groups', icon: 'users', permission: [P.groups, 'Directory.Read.All'],
      description: 'All Entra ID groups.',
      path: '/groups?$select=' + sel(F.group, ['id', 'displayName', 'description', 'mail', 'groupTypes', 'securityEnabled', 'mailEnabled', 'membershipRule', 'createdDateTime']),
      columns: ['displayName', 'description', 'groupTypes', 'securityEnabled', 'membershipRule']
    },
    licenses: {
      name: 'Licenses', icon: 'key', permission: [P.org, 'Directory.Read.All'],
      description: 'Microsoft licenses the organization owns and how many are used.',
      path: '/subscribedSkus',
      columns: ['skuPartNumber', 'prepaidUnits.enabled', 'consumedUnits', 'capabilityStatus', 'appliesTo']
    },
    appCredentials: {
      name: 'App secrets & certificates', icon: 'key', permission: P.apps365, area: 'Apps & consents',
      description: 'Every client secret and certificate on app registrations and enterprise apps, with expiry. Secret values are never read.',
      path: 'view:appCredentials',
      columns: ['appName', 'objectType', 'credentialType', 'credentialName', 'health', 'expires', 'daysLeft']
    },
    userLicenses: {
      name: 'Licenses per user', icon: 'key', permission: [P.users, P.directory], area: 'Users & groups',
      description: 'Every user and each license they hold: assigned directly or by a group, and any assignment errors.',
      path: 'view:userLicenses',
      columns: ['displayName', 'userPrincipalName', 'license', 'assignedBy', 'assignmentState', 'assignmentError', 'accountEnabled', 'department']
    },
    auditLog: {
      name: 'Intune audit log (30 days)', icon: 'clock',
      permission: [P.apps, P.config, P.devices, P.service, 'DeviceManagementRBAC.Read.All'],
      description: 'Who changed what in Intune over the last 30 days.',
      path: '/deviceManagement/auditEvents?$filter=activityDateTime ge {daysAgo:30}',
      columns: ['activityDateTime', 'actor.userPrincipalName', 'displayName', 'activityType', 'category', 'activityResult']
    }
  };

  // Areas for the "Build your own" picker. Hand-made sources first, then everything generated from the schema.
  const CURATED_AREA = {
    assignments: 'Assignments', appDetails: 'Apps & app protection', appRelationships: 'Apps & app protection',
    connectors: 'Connectors & tenant settings', windowsRecovery: 'Devices', autopilotEntra: 'Enrollment & Autopilot',
    devices: 'Devices', entraDevices: 'Devices', detectedApps: 'Apps & app protection', mobileApps: 'Apps & app protection',
    appProtection: 'Apps & app protection', compliancePolicies: 'Configuration & compliance', complianceSettings: 'Configuration & compliance',
    encryption: 'Devices', malware: 'Devices', configProfiles: 'Configuration & compliance', settingsCatalog: 'Configuration & compliance',
    adminTemplates: 'Configuration & compliance', scripts: 'Configuration & compliance', remediations: 'Configuration & compliance',
    autopilot: 'Enrollment & Autopilot', autopilotProfiles: 'Enrollment & Autopilot', enrollmentConfigs: 'Enrollment & Autopilot',
    users: 'Users & groups', groups: 'Users & groups', licenses: 'Tenant', auditLog: 'Audit logs'
  };
  Object.entries(SOURCES).forEach(([id, s]) => { s.area = s.area || CURATED_AREA[id] || 'Other'; s.curated = true; });
  const basePath = p => String(p || '').split('?')[0].replace(/\/+$/, '').toLowerCase();
  const taken = new Set(Object.values(SOURCES).map(s => basePath(s.path)));
  (EXTRA.sources || []).forEach(x => {
    if (SOURCES[x.id] || (!x.path.startsWith('view:') && taken.has(basePath(x.path)) && !x.path.includes('?'))) return;
    SOURCES[x.id] = {
      name: x.name, icon: x.icon || 'report', permission: x.permission, area: x.area, path: x.path, columns: x.columns || [],
      description: x.description || (x.single ? 'A single record from Intune.' : 'All records from Microsoft Graph: ' + x.path)
    };
  });
  // Which Microsoft licence a source needs, so reports can say so before asking Microsoft.
  const NEEDS_P1 = ['entraUsersSignIns', 'entraConditionalAccess', 'entraNamedLocations', 'entraMfaRegistration', 'entraSignIns', 'entraProvisioning'];
  const NEEDS_P2 = ['entraRoleEligible', 'entraRiskyUsers', 'entraRiskDetections'];
  const INTUNE_VIEWS = ['assignments', 'appDetails', 'appRelationships', 'connectors', 'windowsRecovery', 'autopilotEntra'];
  Object.entries(SOURCES).forEach(([id, s]) => {
    const p = String(s.path || '');
    if (NEEDS_P1.includes(id)) s.requires = 'entraP1';
    else if (NEEDS_P2.includes(id)) s.requires = 'entraP2';
    else if (p.startsWith('/deviceManagement/virtualEndpoint')) s.requires = 'windows365';
    else if (p.startsWith('/deviceManagement') || p.startsWith('/deviceAppManagement') || p.startsWith('view:export:') ||
      INTUNE_VIEWS.includes(p.replace('view:', ''))) s.requires = 'intune';
  });

  const AREAS = ['Assignments', 'Devices', 'Configuration & compliance', 'Apps & app protection', 'Enrollment & Autopilot',
    'Endpoint analytics', 'Connectors & tenant settings', 'Intune roles & scope tags', 'Windows 365', 'Monitoring & alerts',
    'Users & groups', 'Identity & access', 'Apps & consents', 'Audit logs', 'Security', 'Microsoft 365 service', 'Tenant',
    'Intune reports: Devices', 'Intune reports: Apps', 'Intune reports: Compliance', 'Intune reports: Device configuration',
    'Intune reports: Endpoint security', 'Intune reports: Endpoint analytics', 'Intune reports: Windows updates',
    'Intune reports: Enrollment', 'Intune reports: Co-management', 'Intune reports: Scripts and remediations',
    'Intune reports: Users', 'Reference data (Microsoft catalogs)', 'Other'];

  const CATEGORIES = [
    { id: 'devices', name: 'Devices', icon: 'device' },
    { id: 'security', name: 'Compliance & security', icon: 'shield' },
    { id: 'config', name: 'Configuration', icon: 'sliders' },
    { id: 'assignments', name: 'Assignments', icon: 'target' },
    { id: 'apps', name: 'Apps', icon: 'apps' },
    { id: 'updates', name: 'Updates', icon: 'refresh' },
    { id: 'analytics', name: 'Endpoint analytics', icon: 'chart' },
    { id: 'enrollment', name: 'Enrollment & Autopilot', icon: 'rocket' },
    { id: 'directory', name: 'Users, groups & licenses', icon: 'users' },
    { id: 'identity', name: 'Identity & access', icon: 'key' },
    { id: 'm365', name: 'Microsoft 365 & security', icon: 'alert' },
    { id: 'w365', name: 'Windows 365', icon: 'device' },
    { id: 'activity', name: 'Activity', icon: 'clock' }
  ];

  const R = (o) => o;
  const NA = ['Not assigned', "Couldn't read"]; // assignment rows that aren't real assignments
  const REPORTS = [
    // ---- Devices
    R({ id: 'all-devices', category: 'devices', source: 'devices', name: 'All managed devices',
      description: 'Every device in Intune with its user, OS and compliance state.', summaryBy: 'operatingSystem' }),
    R({ id: 'stale-devices', category: 'devices', source: 'devices', name: 'Devices not checked in for 30+ days',
      description: 'Devices that may be lost, retired or broken. Good clean-up candidates.',
      columns: ['deviceName', 'userDisplayName', 'operatingSystem', 'lastSyncDateTime', 'enrolledDateTime', 'model', 'serialNumber'],
      filters: [{ col: 'lastSyncDateTime', op: 'olderThan', value: 30 }], sort: { col: 'lastSyncDateTime', dir: 'asc' }, summaryBy: 'operatingSystem' }),
    R({ id: 'windows-devices', category: 'devices', source: 'devices', name: 'Windows devices',
      description: 'Windows PCs with version, edition and how they are joined.',
      columns: ['deviceName', 'userDisplayName', 'osVersion', 'skuFamily', 'joinType', 'complianceState', 'lastSyncDateTime', 'manufacturer', 'model', 'serialNumber'],
      filters: [{ col: 'operatingSystem', op: 'eq', value: 'Windows' }], summaryBy: 'osVersion' }),
    R({ id: 'apple-mobile', category: 'devices', source: 'devices', name: 'iPhone & iPad devices',
      description: 'iOS and iPadOS devices with model and supervision.',
      columns: ['deviceName', 'userDisplayName', 'operatingSystem', 'osVersion', 'model', 'isSupervised', 'complianceState', 'lastSyncDateTime', 'serialNumber'],
      filters: [{ col: 'operatingSystem', op: 'in', value: ['iOS', 'iPadOS'] }], summaryBy: 'osVersion' }),
    R({ id: 'android-devices', category: 'devices', source: 'devices', name: 'Android devices',
      description: 'Android phones and tablets.',
      columns: ['deviceName', 'userDisplayName', 'osVersion', 'manufacturer', 'model', 'deviceEnrollmentType', 'complianceState', 'lastSyncDateTime'],
      filters: [{ col: 'operatingSystem', op: 'eq', value: 'Android' }], summaryBy: 'deviceEnrollmentType' }),
    R({ id: 'mac-devices', category: 'devices', source: 'devices', name: 'Mac devices',
      description: 'macOS computers.',
      columns: ['deviceName', 'userDisplayName', 'osVersion', 'model', 'isEncrypted', 'complianceState', 'lastSyncDateTime', 'serialNumber'],
      filters: [{ col: 'operatingSystem', op: 'eq', value: 'macOS' }], summaryBy: 'osVersion' }),
    R({ id: 'personal-devices', category: 'devices', source: 'devices', name: 'Personal (BYOD) devices',
      description: 'Devices marked as personally owned.',
      filters: [{ col: 'managedDeviceOwnerType', op: 'eq', value: 'personal' }], summaryBy: 'operatingSystem' }),
    R({ id: 'no-user-devices', category: 'devices', source: 'devices', name: 'Devices without a primary user',
      description: 'Shared, kiosk or userless devices.',
      columns: ['deviceName', 'operatingSystem', 'osVersion', 'deviceEnrollmentType', 'lastSyncDateTime', 'model', 'serialNumber'],
      filters: [{ col: 'userPrincipalName', op: 'empty' }], summaryBy: 'operatingSystem' }),
    R({ id: 'new-devices', category: 'devices', source: 'devices', name: 'Enrolled in the last 7 days',
      description: 'Recently enrolled devices.',
      columns: ['deviceName', 'userDisplayName', 'operatingSystem', 'enrolledDateTime', 'deviceEnrollmentType', 'model', 'complianceState'],
      filters: [{ col: 'enrolledDateTime', op: 'newerThan', value: 7 }], sort: { col: 'enrolledDateTime', dir: 'desc' }, summaryBy: 'operatingSystem' }),
    R({ id: 'low-storage', category: 'devices', source: 'devices', name: 'Low free disk space',
      description: 'Windows and Mac devices with less than 10 GB free.',
      columns: ['deviceName', 'userDisplayName', 'operatingSystem', 'freeStorageSpaceInBytes', 'totalStorageSpaceInBytes', 'model', 'lastSyncDateTime'],
      filters: [{ col: 'operatingSystem', op: 'in', value: ['Windows', 'macOS'] }, { col: 'freeStorageSpaceInBytes', op: 'lt', value: 10 }],
      sort: { col: 'freeStorageSpaceInBytes', dir: 'asc' }, summaryBy: 'operatingSystem' }),
    R({ id: 'entra-devices', category: 'devices', source: 'entraDevices', name: 'Entra ID devices',
      description: 'All devices registered or joined in Entra ID.', summaryBy: 'trustType' }),
    R({ id: 'stale-entra-devices', category: 'devices', source: 'entraDevices', name: 'Entra ID devices inactive 90+ days',
      description: 'Entra device objects with no sign-in for 90 days.',
      filters: [{ col: 'approximateLastSignInDateTime', op: 'olderThan', value: 90 }], sort: { col: 'approximateLastSignInDateTime', dir: 'asc' }, summaryBy: 'operatingSystem' }),

    // ---- Compliance & security
    R({ id: 'noncompliant', category: 'security', source: 'devices', name: 'Non-compliant devices',
      description: 'Devices failing a compliance policy, so they may be blocked from company data.',
      columns: ['deviceName', 'userDisplayName', 'userPrincipalName', 'operatingSystem', 'osVersion', 'complianceState', 'lastSyncDateTime', 'model'],
      filters: [{ col: 'complianceState', op: 'eq', value: 'noncompliant' }], summaryBy: 'operatingSystem' }),
    R({ id: 'compliance-overview', category: 'security', source: 'devices', name: 'Compliance overview',
      description: 'All devices broken down by compliance state.',
      columns: ['deviceName', 'userDisplayName', 'operatingSystem', 'complianceState', 'lastSyncDateTime'], summaryBy: 'complianceState' }),
    R({ id: 'unencrypted', category: 'security', source: 'devices', name: 'Unencrypted devices',
      description: 'Windows and Mac devices reporting that their disk is not encrypted.',
      columns: ['deviceName', 'userDisplayName', 'operatingSystem', 'osVersion', 'isEncrypted', 'complianceState', 'lastSyncDateTime'],
      filters: [{ col: 'operatingSystem', op: 'in', value: ['Windows', 'macOS'] }, { col: 'isEncrypted', op: 'isfalse' }], summaryBy: 'operatingSystem' }),
    R({ id: 'encryption-report', category: 'security', source: 'encryption', name: 'Encryption readiness',
      description: 'BitLocker / FileVault status, TPM version and readiness.', summaryBy: 'encryptionState' }),
    R({ id: 'compliance-settings', category: 'security', source: 'complianceSettings', name: 'Which compliance settings fail most',
      description: 'For every compliance setting, the number of devices failing it.',
      sort: { col: 'nonCompliantDeviceCount', dir: 'desc' } }),
    R({ id: 'compliance-policies', category: 'security', source: 'compliancePolicies', name: 'Compliance policies',
      description: 'All compliance policies and their platform.', summaryBy: '@odata.type' }),
    R({ id: 'malware', category: 'security', source: 'malware', name: 'Malware detections',
      description: 'Threats Defender has found on managed devices.', summaryBy: 'severity' }),
    R({ id: 'bitlocker-missing', category: 'security', source: 'windowsRecovery', name: 'Encrypted devices with no BitLocker key in Entra ID',
      description: 'If one of these locks up, nobody can get the recovery key. Shows whether a key exists, never the key.',
      filters: [{ col: 'isEncrypted', op: 'istrue' }, { col: 'bitlockerKey', op: 'in', value: ['Missing', 'Data drives only'] }], summaryBy: 'bitlockerKey' }),
    R({ id: 'recovery-backup', category: 'security', source: 'windowsRecovery', name: 'BitLocker & LAPS backup status',
      description: 'Every Windows device: BitLocker recovery key and local admin (LAPS) password saved to Entra ID or not.', summaryBy: 'bitlockerKey' }),
    R({ id: 'laps-missing', category: 'security', source: 'windowsRecovery', name: 'Windows devices with no LAPS password backed up',
      description: 'Devices where Windows LAPS has not saved a local admin password to Entra ID.',
      filters: [{ col: 'lapsPassword', op: 'eq', value: 'Missing' }], summaryBy: 'joinType' }),
    R({ id: 'jailbroken', category: 'security', source: 'devices', name: 'Jailbroken / rooted devices',
      description: 'Mobile devices reported as jailbroken or rooted.',
      columns: ['deviceName', 'userDisplayName', 'operatingSystem', 'osVersion', 'jailBroken', 'lastSyncDateTime'],
      filters: [{ col: 'jailBroken', op: 'eq', value: 'True' }] }),

    // ---- Configuration
    R({ id: 'config-profiles', category: 'config', source: 'configProfiles', name: 'Configuration profiles',
      description: 'All device configuration profiles and their type.', summaryBy: '@odata.type' }),
    R({ id: 'settings-catalog', category: 'config', source: 'settingsCatalog', name: 'Settings catalog policies',
      description: 'Policies built with the settings catalog.', summaryBy: 'platforms' }),
    R({ id: 'unassigned-policies', category: 'config', source: 'settingsCatalog', name: 'Unassigned settings catalog policies',
      description: 'Policies that are not assigned to anyone, so they do nothing.',
      filters: [{ col: 'isAssigned', op: 'isfalse' }] }),
    R({ id: 'admin-templates', category: 'config', source: 'adminTemplates', name: 'Administrative templates',
      description: 'ADMX-based configuration profiles.' }),
    R({ id: 'scripts', category: 'config', source: 'scripts', name: 'PowerShell scripts',
      description: 'Platform scripts deployed to Windows devices.', summaryBy: 'runAsAccount' }),
    R({ id: 'remediations', category: 'config', source: 'remediations', name: 'Remediations',
      description: 'Detection & remediation script packages.', summaryBy: 'publisher' }),

    // ---- Assignments
    R({ id: 'all-assignments', category: 'assignments', source: 'assignments', name: 'Everything assigned, and to whom',
      description: 'Apps, policies, profiles, scripts and more in one list, with groups, filters and member counts.',
      filters: [{ col: 'targetKind', op: 'notin', value: NA }], summaryBy: 'itemType' }),
    R({ id: 'app-assignments', category: 'assignments', source: 'assignments', name: 'App assignments',
      description: 'Each app and who gets it: Required, Available or Uninstall, included or excluded.',
      columns: ['itemName', '@odata.type', 'intent', 'targetMode', 'target', 'deviceMembers', 'userMembers', 'filterName', 'filterMode', 'deadline'],
      filters: [{ col: 'itemType', op: 'eq', value: 'App' }], summaryBy: 'intent' }),
    R({ id: 'policy-assignments', category: 'assignments', source: 'assignments', name: 'Policy & profile assignments',
      description: 'Compliance, configuration, security, update and enrollment policies and who they apply to.',
      filters: [{ col: 'itemType', op: 'ne', value: 'App' }, { col: 'targetKind', op: 'notin', value: NA }], summaryBy: 'itemType' }),
    R({ id: 'assignments-by-group', category: 'assignments', source: 'assignments', name: 'Where each group is used',
      description: 'Pick a group in the summary to see everything assigned to it.',
      columns: ['target', 'groupType', 'deviceMembers', 'userMembers', 'targetMode', 'itemType', 'itemName', 'intent'],
      filters: [{ col: 'targetKind', op: 'notin', value: NA }], sort: { col: 'target', dir: 'asc' }, summaryBy: 'target' }),
    R({ id: 'all-users-devices', category: 'assignments', source: 'assignments', name: 'Assigned to All users or All devices',
      description: 'Broad assignments that reach everyone. Worth a second look.',
      filters: [{ col: 'targetKind', op: 'in', value: ['All users', 'All devices'] }], summaryBy: 'itemType' }),
    R({ id: 'exclusions', category: 'assignments', source: 'assignments', name: 'Exclusions',
      description: 'Groups that are excluded from an app or policy.',
      filters: [{ col: 'targetMode', op: 'eq', value: 'Exclude' }], summaryBy: 'itemType' }),
    R({ id: 'filter-usage', category: 'assignments', source: 'assignments', name: 'Assignment filters in use',
      description: 'Which assignments use a filter, and which filter.',
      columns: ['filterName', 'filterMode', 'filterPlatform', 'filterRule', 'itemType', 'itemName', 'target'],
      filters: [{ col: 'filterName', op: 'notempty' }], summaryBy: 'filterName' }),
    R({ id: 'empty-group-assignments', category: 'assignments', source: 'assignments', name: 'Assigned to empty or deleted groups',
      description: 'These assignments reach nobody: the group has no members or no longer exists.',
      columns: ['itemType', 'itemName', 'intent', 'targetMode', 'target', 'targetKind', 'groupType', 'deviceMembers', 'userMembers'],
      filters: [{ col: 'emptyTarget', op: 'istrue' }], summaryBy: 'itemType' }),
    R({ id: 'unassigned-policies-all', category: 'assignments', source: 'assignments', name: 'Policies & profiles not assigned to anyone',
      description: 'Created but never assigned, across every policy type. (For apps, see Unassigned apps.)',
      columns: ['itemType', 'itemName', 'platform', 'lastModifiedDateTime'],
      filters: [{ col: 'targetKind', op: 'eq', value: 'Not assigned' }], summaryBy: 'itemType' }),

    // ---- Apps
    R({ id: 'app-details', category: 'apps', source: 'appDetails', name: 'App versions & install details',
      description: 'Version, install command, run-as context, detection rules and how many groups get each app.', summaryBy: '@odata.type' }),
    R({ id: 'win32-apps', category: 'apps', source: 'appDetails', name: 'Win32 apps: install commands & detection',
      description: 'Everything you need to check a Win32 app package at a glance.',
      columns: ['displayName', 'appVersion', 'installCommandLine', 'uninstallCommandLine', 'installContext', 'detection', 'sizeMB'],
      filters: [{ col: '@odata.type', op: 'eq', value: '#microsoft.graph.win32LobApp' }], summaryBy: 'installContext' }),
    R({ id: 'app-relationships', category: 'apps', source: 'appRelationships', name: 'App supersedence & dependencies',
      description: 'Which apps replace or need other apps. Risky supersedence (same detection rule on both apps) is flagged.', summaryBy: 'relationship' }),
    R({ id: 'risky-supersedence', category: 'apps', source: 'appRelationships', name: 'Supersedence that may not work',
      description: 'Both apps are detected the same way, so Intune may treat the new app as already installed.',
      filters: [{ col: 'atRisk', op: 'istrue' }], summaryBy: 'detectionOverlap' }),
    R({ id: 'all-apps', category: 'apps', source: 'mobileApps', name: 'All apps in Intune',
      description: 'Every app added to Intune and its type.', summaryBy: '@odata.type' }),
    R({ id: 'unassigned-apps', category: 'apps', source: 'mobileApps', name: 'Unassigned apps',
      description: 'Apps added to Intune but not deployed to anyone.',
      filters: [{ col: 'isAssigned', op: 'isfalse' }], summaryBy: '@odata.type' }),
    R({ id: 'discovered-apps', category: 'apps', source: 'detectedApps', name: 'Discovered apps (software inventory)',
      description: 'Software found on devices, most common first.',
      sort: { col: 'deviceCount', dir: 'desc' }, summaryBy: 'platform' }),
    R({ id: 'app-protection', category: 'apps', source: 'appProtection', name: 'App protection policies',
      description: 'MAM policies that protect company data inside apps.', summaryBy: '@odata.type' }),

    // ---- Enrollment
    R({ id: 'autopilot', category: 'enrollment', source: 'autopilot', name: 'Autopilot devices',
      description: 'All hardware registered for Windows Autopilot.', summaryBy: 'groupTag' }),
    R({ id: 'autopilot-not-enrolled', category: 'enrollment', source: 'autopilot', name: 'Autopilot devices not yet enrolled',
      description: 'Registered for Autopilot but never set up.',
      filters: [{ col: 'enrollmentState', op: 'ne', value: 'enrolled' }], summaryBy: 'groupTag' }),
    R({ id: 'autopilot-no-profile', category: 'enrollment', source: 'autopilot', name: 'Autopilot devices without a profile',
      description: 'Devices that will not get an Autopilot experience yet.',
      filters: [{ col: 'deploymentProfileAssignmentStatus', op: 'notin', value: ['assignedInSync', 'assignedOutOfSync', 'assignedUnkownSyncState'] }], summaryBy: 'deploymentProfileAssignmentStatus' }),
    R({ id: 'autopilot-entra', category: 'enrollment', source: 'autopilotEntra', name: 'Autopilot devices with a missing Entra ID device',
      description: 'The Entra ID device object is missing or disabled, so Autopilot can fail or apply the wrong profile.',
      filters: [{ col: 'entraStatus', op: 'in', value: ['Entra device missing', 'Entra device disabled', 'No Entra device linked'] }], summaryBy: 'entraStatus' }),
    R({ id: 'connectors', category: 'enrollment', source: 'connectors', name: 'Connectors & tokens: expiry and sync',
      description: 'Apple push certificate, Apple enrollment and VPP tokens, Managed Google Play and other connectors.',
      sort: { col: 'daysLeft', dir: 'asc' }, summaryBy: 'health' }),
    R({ id: 'autopilot-profiles', category: 'enrollment', source: 'autopilotProfiles', name: 'Autopilot profiles',
      description: 'Deployment profiles and device naming templates.' }),
    R({ id: 'enrollment-configs', category: 'enrollment', source: 'enrollmentConfigs', name: 'Enrollment restrictions & settings',
      description: 'Platform restrictions, device limits, Windows Hello, ESP.', sort: { col: 'priority', dir: 'asc' }, summaryBy: '@odata.type' }),

    // ---- Directory
    R({ id: 'users', category: 'directory', source: 'users', name: 'All users',
      description: 'Every user account with job title and department.', summaryBy: 'department' }),
    R({ id: 'disabled-users', category: 'directory', source: 'users', name: 'Disabled users',
      description: 'Accounts that are blocked from signing in.',
      filters: [{ col: 'accountEnabled', op: 'isfalse' }], summaryBy: 'department' }),
    R({ id: 'guest-users', category: 'directory', source: 'users', name: 'Guest users',
      description: 'External people invited into the tenant.',
      columns: ['displayName', 'mail', 'userPrincipalName', 'accountEnabled', 'createdDateTime'],
      filters: [{ col: 'userType', op: 'eq', value: 'Guest' }] }),
    R({ id: 'groups', category: 'directory', source: 'groups', name: 'All groups',
      description: 'Security and Microsoft 365 groups.', summaryBy: 'groupTypes' }),
    R({ id: 'dynamic-groups', category: 'directory', source: 'groups', name: 'Dynamic groups',
      description: 'Groups whose members are added automatically by a rule.',
      filters: [{ col: 'membershipRule', op: 'notempty' }] }),
    R({ id: 'licenses', category: 'directory', source: 'licenses', name: 'Licenses',
      description: 'Licenses owned vs. assigned.', sort: { col: 'consumedUnits', dir: 'desc' } }),

    // ---- Activity
    R({ id: 'audit-log', category: 'activity', source: 'auditLog', name: 'Intune changes (last 30 days)',
      description: 'Who changed what in Intune and when.', sort: { col: 'activityDateTime', dir: 'desc' }, summaryBy: 'category' }),
    R({ id: 'remote-actions', category: 'activity', source: 'g.deviceManagement.remoteActionAudits', name: 'Remote actions (wipe, retire, sync...)',
      description: 'Every remote action an admin ran on a device, who ran it and whether it worked.', sort: { col: 'requestDateTime', dir: 'desc' }, summaryBy: 'action' }),
    R({ id: 'entra-audit', category: 'activity', source: 'entraDirectoryAudits', name: 'Entra ID changes (last 7 days)',
      description: 'Changes to users, groups, apps and roles.', sort: { col: 'activityDateTime', dir: 'desc' }, summaryBy: 'category' }),
    R({ id: 'sign-ins', category: 'activity', source: 'entraSignIns', name: 'Sign-ins (last 24 hours)',
      description: 'Every sign-in with app, location, device and result. Needs Entra ID P1.', sort: { col: 'createdDateTime', dir: 'desc' }, summaryBy: 'appDisplayName' }),

    // ---- Devices (more)
    R({ id: 'device-inventory', category: 'devices', source: 'x.DevicesWithInventory', name: 'Device hardware & inventory',
      description: "Intune's full inventory export: serial, model, storage, TPM, BIOS, processor, Wi-Fi IP, carrier and more." }),
    R({ id: 'devices-export', category: 'devices', source: 'x.Devices', name: 'All devices (Intune export)',
      description: "Intune's own All devices export with every column, as the admin center exports it." }),
    R({ id: 'cert-expiring', category: 'devices', source: 'devices', name: 'Device management certificates expiring soon',
      description: 'Devices whose Intune management certificate expires in the next 30 days. They stop checking in if it lapses.',
      columns: ['deviceName', 'userPrincipalName', 'operatingSystem', 'managementCertificateExpirationDate', 'lastSyncDateTime'],
      filters: [{ col: 'managementCertificateExpirationDate', op: 'newerThan', value: -30 }], sort: { col: 'managementCertificateExpirationDate', dir: 'asc' } }),
    R({ id: 'device-threat', category: 'devices', source: 'devices', name: 'Threat state reported by Defender / partners',
      description: 'Mobile Threat Defense and Defender for Endpoint risk level per device.',
      columns: ['deviceName', 'userPrincipalName', 'operatingSystem', 'partnerReportedThreatState', 'complianceState', 'lastSyncDateTime'],
      filters: [{ col: 'partnerReportedThreatState', op: 'notin', value: ['unknown', 'activated', 'secured', 'lowSeverity'] }], summaryBy: 'partnerReportedThreatState' }),
    R({ id: 'co-managed', category: 'devices', source: 'x.ComanagedDeviceWorkloads', name: 'Co-managed devices & workloads',
      description: 'Devices managed by both Configuration Manager and Intune, and which workloads Intune owns.' }),
    R({ id: 'device-categories', category: 'devices', source: 'devices', name: 'Devices by category',
      description: 'How devices are spread across device categories.', summaryBy: 'deviceCategoryDisplayName' }),
    R({ id: 'device-models', category: 'devices', source: 'devices', name: 'Devices by manufacturer & model',
      description: 'Hardware mix across the fleet.', columns: ['deviceName', 'manufacturer', 'model', 'operatingSystem', 'osVersion', 'chassisType', 'enrolledDateTime'], summaryBy: 'model' }),
    R({ id: 'cleanup-rules', category: 'devices', source: 'g.deviceManagement.managedDeviceCleanupRules', name: 'Device clean-up rules',
      description: 'Rules that automatically remove devices that stopped checking in.' }),

    // ---- Compliance & security (more)
    R({ id: 'noncompliant-settings', category: 'security', source: 'x.NoncompliantDevicesAndSettings', name: 'Non-compliant devices and the failing settings',
      description: 'For every non-compliant device: which policy and which setting fails.', summaryBy: 'SettingName' }),
    R({ id: 'no-compliance-policy', category: 'security', source: 'x.DevicesWithoutCompliancePolicy', name: 'Devices without a compliance policy',
      description: 'Devices no compliance policy applies to.', summaryBy: 'OS' }),
    R({ id: 'device-compliance-export', category: 'security', source: 'x.DeviceCompliance', name: 'Device compliance (Intune export)',
      description: "Intune's compliance report for every device, with grace period and threat level.", summaryBy: 'ComplianceState' }),
    R({ id: 'defender-agents', category: 'security', source: 'x.DefenderAgents', name: 'Microsoft Defender antivirus status',
      description: 'Real-time protection, tamper protection, signature age and agent state per device.', summaryBy: 'DeviceState' }),
    R({ id: 'defender-unhealthy', category: 'security', source: 'x.UnhealthyDefenderAgents', name: 'Unhealthy Defender antivirus agents',
      description: 'Devices where Defender protection is off, out of date or failing.', summaryBy: 'DeviceState' }),
    R({ id: 'active-malware', category: 'security', source: 'x.ActiveMalware', name: 'Active malware (Intune export)',
      description: 'Threats still active on devices, with severity and state.', summaryBy: 'Severity' }),
    R({ id: 'firewall-off', category: 'security', source: 'x.FirewallUnhealthyStatus', name: 'Windows Firewall off or unhealthy',
      description: 'Devices where Windows Firewall is not fully on.', summaryBy: 'FirewallStatus' }),
    R({ id: 'tpm-attestation', category: 'security', source: 'x.TpmAttestationStatus', name: 'TPM attestation status',
      description: 'Whether each Windows device passed TPM attestation, with TPM version and maker.', summaryBy: 'AttestationStatus' }),
    R({ id: 'health-attestation', category: 'security', source: 'x.WindowsDeviceHealthAttestationReport', name: 'Windows device health attestation',
      description: 'Secure Boot, BitLocker, code integrity, VBS and memory protection per device.', summaryBy: 'SecureBootStatus' }),
    R({ id: 'device-certificates', category: 'security', source: 'x.AllDeviceCertificates', name: 'Certificates issued to devices',
      description: 'SCEP / PKCS certificates on devices, with issuer, subject and validity.', sort: { col: 'ValidTo', dir: 'asc' }, summaryBy: 'CertificateStatus' }),
    R({ id: 'encryption-states', category: 'security', source: 'encryption', name: 'Encryption state per device',
      description: 'BitLocker / FileVault state and readiness for every device.', summaryBy: 'encryptionState' }),

    // ---- Configuration (more)
    R({ id: 'remediation-results', category: 'config', source: 'x.PolicyRunStatesByProactiveRemediation', name: 'Remediation results per device',
      description: 'For every remediation and device: detection result, whether it fixed the issue, and script output.', summaryBy: 'PolicyName' }),
    R({ id: 'script-results', category: 'config', source: 'x.DeviceRunStatesByScript', name: 'Platform script results per device',
      description: 'Whether each PowerShell script succeeded or failed on each device.', summaryBy: 'RunState' }),
    R({ id: 'config-conflicts', category: 'config', source: 'g.deviceManagement.deviceConfigurationConflictSummary', name: 'Configuration conflicts',
      description: 'Settings that two or more profiles set differently.' }),
    R({ id: 'assignment-filters', category: 'config', source: 'g.deviceManagement.assignmentFilters', name: 'Assignment filters',
      description: 'Every assignment filter with its platform and rule.', summaryBy: 'platform' }),
    R({ id: 'compliance-scripts', category: 'config', source: 'g.deviceManagement.deviceComplianceScripts', name: 'Custom compliance scripts',
      description: 'Discovery scripts used by custom compliance policies.' }),
    R({ id: 'macos-scripts', category: 'config', source: 'g.deviceManagement.deviceShellScripts', name: 'macOS shell scripts',
      description: 'Shell scripts pushed to Macs.' }),
    R({ id: 'gp-analytics', category: 'config', source: 'x.GPAnalyticsSettingMigrationReadiness', name: 'Group Policy analytics: migration readiness',
      description: 'Which of your on-premises Group Policy settings can move to Intune.', summaryBy: 'MdmSupportedState' }),
    R({ id: 'scope-tags', category: 'config', source: 'g.deviceManagement.roleScopeTags', name: 'Intune scope tags',
      description: 'Scope tags used to split Intune administration.' }),
    R({ id: 'intune-roles', category: 'config', source: 'g.deviceManagement.roleAssignments', name: 'Intune role assignments',
      description: 'Who holds which Intune admin role and over which groups.' }),

    // ---- Apps (more)
    R({ id: 'app-install-status', category: 'apps', source: 'x.OrgDeviceInstallStatus', name: 'App install status per device',
      description: 'Every app on every device: installed, failed, pending or not applicable, with error codes.', summaryBy: 'InstallState' }),
    R({ id: 'app-install-failures', category: 'apps', source: 'x.OrgDeviceInstallStatus', name: 'Failed app installs',
      description: 'Devices where an app failed to install, with the error code.',
      filters: [{ col: 'InstallState', op: 'contains', value: 'fail' }], summaryBy: 'ApplicationName' }),
    R({ id: 'app-install-summary', category: 'apps', source: 'x.AppInstallStatusAggregate', name: 'App install summary',
      description: 'For each app: how many devices and users installed it, failed or are pending.', sort: { col: 'FailedDeviceCount', dir: 'desc' } }),
    R({ id: 'discovered-per-device', category: 'apps', source: 'x.AppInvRawData', name: 'Discovered apps per device',
      description: 'Every piece of software on every device (raw inventory).', summaryBy: 'ApplicationName' }),
    R({ id: 'mam-status', category: 'apps', source: 'x.MAMAppProtectionStatus', name: 'App protection status per user',
      description: 'Which users have protected apps, on which devices, and whether they checked in.', summaryBy: 'AppProtectionStatus' }),
    R({ id: 'mam-registrations', category: 'apps', source: 'g.deviceAppManagement.managedAppRegistrations', name: 'Devices registered for app protection (MAM)',
      description: 'Apps and devices registered with Intune app protection, including unenrolled devices.', summaryBy: 'platformVersion' }),
    R({ id: 'app-config-policies', category: 'apps', source: 'g.deviceAppManagement.mobileAppConfigurations', name: 'App configuration policies (devices)',
      description: 'App configuration policies for managed devices.', summaryBy: '@odata.type' }),
    R({ id: 'vpp-tokens', category: 'apps', source: 'g.deviceAppManagement.vppTokens', name: 'Apple VPP tokens',
      description: 'Apple apps & books tokens, their state and expiry.' }),
    R({ id: 'policy-sets', category: 'apps', source: 'g.deviceAppManagement.policySets', name: 'Policy sets',
      description: 'Bundles of apps and policies assigned together.' }),

    // ---- Updates
    R({ id: 'update-rings', category: 'updates', source: 'configProfiles', name: 'Windows Update rings',
      description: 'Windows Update for Business rings and their deferral settings.',
      filters: [{ col: '@odata.type', op: 'eq', value: '#microsoft.graph.windowsUpdateForBusinessConfiguration' }] }),
    R({ id: 'feature-updates', category: 'updates', source: 'x.FeatureUpdatePolicyStatusSummary', name: 'Feature update status by policy',
      description: 'For each Windows feature update policy: devices succeeded, in progress or in error.' }),
    R({ id: 'quality-updates', category: 'updates', source: 'x.QualityUpdatePolicyStatusSummary', name: 'Expedited quality update status',
      description: 'For each expedited quality update policy: devices succeeded, in progress or in error.' }),
    R({ id: 'driver-updates', category: 'updates', source: 'x.DriverUpdatePolicyStatusSummary', name: 'Driver update status by policy',
      description: 'Driver update policies: drivers needing review, paused, succeeded or failed.' }),
    R({ id: 'feature-update-profiles', category: 'updates', source: 'g.deviceManagement.windowsFeatureUpdateProfiles', name: 'Feature update profiles',
      description: 'Which Windows version each feature update profile targets.' }),
    R({ id: 'ios-updates', category: 'updates', source: 'g.deviceManagement.iosUpdateStatuses', name: 'iOS/iPadOS update status',
      description: 'Install status of iOS/iPadOS updates per device.', summaryBy: 'installStatus' }),
    R({ id: 'macos-updates', category: 'updates', source: 'g.deviceManagement.macOSSoftwareUpdateAccountSummaries', name: 'macOS update status',
      description: 'macOS software update results per device.' }),
    R({ id: 'windows-versions', category: 'updates', source: 'devices', name: 'Windows versions in use',
      description: 'Every Windows build in the fleet, so you can spot devices that are behind.',
      columns: ['deviceName', 'userPrincipalName', 'osVersion', 'skuFamily', 'lastSyncDateTime'],
      filters: [{ col: 'operatingSystem', op: 'eq', value: 'Windows' }], summaryBy: 'osVersion' }),

    // ---- Endpoint analytics
    R({ id: 'ea-startup', category: 'analytics', source: 'x.EAStartupPerfDevicePerformance', name: 'Startup performance per device',
      description: 'Boot and sign-in times, blue screens and restarts per device.', sort: { col: 'StartupPerformanceScore', dir: 'asc' } }),
    R({ id: 'ea-app-reliability', category: 'analytics', source: 'x.EAAppPerformance', name: 'App reliability',
      description: 'Which apps crash or hang most across the fleet.', sort: { col: 'TotalAppCrashes', dir: 'desc' } }),
    R({ id: 'ea-battery', category: 'analytics', source: 'x.BRDeviceBatteryAgg', name: 'Battery health per device',
      description: 'Battery capacity, cycle count and runtime per laptop.', sort: { col: 'BatteryHealthScore', dir: 'asc' } }),
    R({ id: 'ea-wfa', category: 'analytics', source: 'x.EAWFADeviceList', name: 'Work from anywhere / Windows 11 readiness',
      description: 'Cloud management, Autopilot and Windows 11 hardware checks per device.', summaryBy: 'UpgradeEligibility' }),
    R({ id: 'ea-scores', category: 'analytics', source: 'g.deviceManagement.userExperienceAnalyticsDeviceScores', name: 'Endpoint analytics scores per device',
      description: 'Overall, startup, app reliability and battery scores for each device.' }),
    R({ id: 'ea-not-autopilot-ready', category: 'analytics', source: 'g.deviceManagement.userExperienceAnalyticsNotAutopilotReadyDevice', name: 'Devices not ready for Autopilot',
      description: 'Devices that are missing something Windows Autopilot needs.' }),
    R({ id: 'ea-no-cloud-identity', category: 'analytics', source: 'g.deviceManagement.userExperienceAnalyticsDevicesWithoutCloudIdentity', name: 'Devices without a cloud identity',
      description: 'Devices that are not Entra joined or hybrid joined.' }),
    R({ id: 'ea-resource', category: 'analytics', source: 'g.deviceManagement.userExperienceAnalyticsResourcePerformance', name: 'CPU and memory pressure per device',
      description: 'Devices that regularly run out of CPU or memory.' }),

    // ---- Enrollment (more)
    R({ id: 'enrollment-failures', category: 'enrollment', source: 'x.DeviceEnrollmentFailures', name: 'Enrollment failures',
      description: 'Every failed enrollment with the reason.', sort: { col: 'EnrollmentFailureDateTime', dir: 'desc' }, summaryBy: 'FailureReason' }),
    R({ id: 'enrollment-activity', category: 'enrollment', source: 'x.EnrollmentActivity', name: 'Enrollment activity',
      description: 'Every enrollment attempt, successful or not.', sort: { col: 'EnrollmentDateTime', dir: 'desc' }, summaryBy: 'EnrollmentMethod' }),
    R({ id: 'autopilot-deployments', category: 'enrollment', source: 'x.AutopilotV1DeploymentStatus', name: 'Autopilot deployments',
      description: 'Each Autopilot deployment: profile, duration, ESP result and failure details.', summaryBy: 'DeploymentState' }),
    R({ id: 'terms', category: 'enrollment', source: 'g.deviceManagement.termsAndConditions', name: 'Terms and conditions',
      description: 'Terms users must accept to enroll.' }),
    R({ id: 'imported-identities', category: 'enrollment', source: 'g.deviceManagement.importedDeviceIdentities', name: 'Corporate device identifiers',
      description: 'IMEI and serial numbers pre-registered as corporate-owned.' }),

    // ---- Users, groups & licenses (more)
    R({ id: 'user-licenses', category: 'directory', source: 'userLicenses', name: 'Licenses per user',
      description: 'Each user and every license they hold, direct or through a group.', summaryBy: 'license' }),
    R({ id: 'disabled-licensed', category: 'directory', source: 'userLicenses', name: 'Disabled accounts still holding a license',
      description: 'Money left on the table: blocked accounts that still use a paid license.',
      filters: [{ col: 'accountEnabled', op: 'isfalse' }, { col: 'license', op: 'ne', value: '(no license)' }], summaryBy: 'license' }),
    R({ id: 'license-errors', category: 'directory', source: 'userLicenses', name: 'License assignment errors',
      description: 'Group-based license assignments that failed, and why.',
      filters: [{ col: 'assignmentError', op: 'notempty' }], summaryBy: 'assignmentError' }),
    R({ id: 'unlicensed-users', category: 'directory', source: 'userLicenses', name: 'Users without a license',
      description: 'Accounts with no license at all.', filters: [{ col: 'license', op: 'eq', value: '(no license)' }], summaryBy: 'userType' }),
    R({ id: 'inactive-users', category: 'directory', source: 'entraUsersSignIns', name: 'Users with no sign-in for 90+ days',
      description: 'Accounts nobody has used for three months. Needs Entra ID P1.',
      filters: [{ col: 'accountEnabled', op: 'istrue' }, { col: 'signInActivity.lastSuccessfulSignInDateTime', op: 'olderThan', value: 90 }],
      sort: { col: 'signInActivity.lastSuccessfulSignInDateTime', dir: 'asc' }, summaryBy: 'userType' }),
    R({ id: 'user-details', category: 'directory', source: 'users', name: 'User details (all fields)',
      description: 'Every user with contact, organisation, on-premises sync and password fields.',
      columns: ['displayName', 'userPrincipalName', 'employeeId', 'jobTitle', 'department', 'companyName', 'city', 'country', 'mobilePhone', 'onPremisesSyncEnabled', 'lastPasswordChangeDateTime'] }),
    R({ id: 'synced-users', category: 'directory', source: 'users', name: 'Users synced from on-premises AD',
      description: 'Accounts that come from Active Directory, with their last sync time.',
      columns: ['displayName', 'userPrincipalName', 'onPremisesSamAccountName', 'onPremisesDomainName', 'onPremisesLastSyncDateTime', 'accountEnabled'],
      filters: [{ col: 'onPremisesSyncEnabled', op: 'istrue' }], summaryBy: 'onPremisesDomainName' }),
    R({ id: 'old-passwords', category: 'directory', source: 'users', name: 'Passwords not changed for a year',
      description: 'Enabled accounts whose password is over a year old.',
      columns: ['displayName', 'userPrincipalName', 'lastPasswordChangeDateTime', 'passwordPolicies', 'onPremisesSyncEnabled'],
      filters: [{ col: 'accountEnabled', op: 'istrue' }, { col: 'lastPasswordChangeDateTime', op: 'olderThan', value: 365 }], sort: { col: 'lastPasswordChangeDateTime', dir: 'asc' } }),
    R({ id: 'users-managers', category: 'directory', source: 'entraUsersManagers', name: 'Users and their managers',
      description: 'Each user with their manager. Filter for missing managers.', columns: ['displayName', 'userPrincipalName', 'department', 'jobTitle', 'manager.displayName'] }),
    R({ id: 'ownerless-groups', category: 'directory', source: 'entraGroupsOwners', name: 'Groups without an owner',
      description: 'Groups nobody owns, so nobody reviews who is in them.', filters: [{ col: 'owners', op: 'empty' }] }),
    R({ id: 'deleted-users', category: 'directory', source: 'entraDeletedUsers', name: 'Deleted users (can be restored)',
      description: 'Users deleted in the last 30 days.', sort: { col: 'deletedDateTime', dir: 'desc' } }),
    R({ id: 'role-groups', category: 'directory', source: 'groups', name: 'Groups that can hold admin roles',
      description: 'Role-assignable groups: membership changes here change admin rights.', filters: [{ col: 'isAssignableToRole', op: 'istrue' }] }),

    // ---- Identity & access
    R({ id: 'admin-roles', category: 'identity', source: 'entraRoleAssignments', name: 'Who holds Entra ID admin roles',
      description: 'Every active admin role assignment: users, groups and apps.', summaryBy: 'roleDefinition.displayName' }),
    R({ id: 'pim-eligible', category: 'identity', source: 'entraRoleEligible', name: 'Eligible (PIM) admin roles',
      description: 'Roles people can activate when needed. Needs Entra ID P2.', summaryBy: 'roleDefinition.displayName' }),
    R({ id: 'ca-policies', category: 'identity', source: 'entraConditionalAccess', name: 'Conditional Access policies',
      description: 'Every policy and whether it is on, off or report-only. Needs Entra ID P1.', summaryBy: 'state' }),
    R({ id: 'named-locations', category: 'identity', source: 'entraNamedLocations', name: 'Named locations',
      description: 'Trusted IP ranges and countries.' }),
    R({ id: 'mfa-registration', category: 'identity', source: 'entraMfaRegistration', name: 'MFA registration per user',
      description: 'Who is registered for MFA and passwordless, and their default method.', summaryBy: 'isMfaRegistered' }),
    R({ id: 'no-mfa', category: 'identity', source: 'entraMfaRegistration', name: 'Users not registered for MFA',
      description: 'Members who can sign in without a second factor.', filters: [{ col: 'isMfaRegistered', op: 'isfalse' }], summaryBy: 'userType' }),
    R({ id: 'admins-no-mfa', category: 'identity', source: 'entraMfaRegistration', name: 'Admins not registered for MFA',
      description: 'Accounts with admin roles that have no MFA method.', filters: [{ col: 'isAdmin', op: 'istrue' }, { col: 'isMfaRegistered', op: 'isfalse' }] }),
    R({ id: 'auth-methods', category: 'identity', source: 'entraAuthMethodsPolicy', name: 'Authentication methods switched on',
      description: 'Which sign-in methods the tenant allows.', summaryBy: 'state' }),
    R({ id: 'app-credentials', category: 'identity', source: 'appCredentials', name: 'App secrets & certificates expiring',
      description: 'Client secrets and certificates on apps, soonest expiry first. Expired ones break integrations.', sort: { col: 'daysLeft', dir: 'asc' }, summaryBy: 'health' }),
    R({ id: 'enterprise-apps', category: 'identity', source: 'entraServicePrincipals', name: 'Enterprise applications',
      description: 'Every enterprise app / service principal in the tenant.', summaryBy: 'servicePrincipalType' }),
    R({ id: 'app-registrations', category: 'identity', source: 'entraApps', name: 'App registrations',
      description: 'Every app registration and who it is for.', summaryBy: 'signInAudience' }),
    R({ id: 'consents', category: 'identity', source: 'entraConsents', name: 'App consents (delegated permissions)',
      description: 'Which apps users or admins consented to, and the scopes granted.', summaryBy: 'consentType' }),
    R({ id: 'risky-users', category: 'identity', source: 'entraRiskyUsers', name: 'Risky users',
      description: 'Users flagged by Entra ID Protection. Needs Entra ID P2.', summaryBy: 'riskLevel' }),
    R({ id: 'tenant-policy', category: 'identity', source: 'entraAuthorizationPolicy', name: 'Tenant guest & consent settings',
      description: 'Guest access, app registration and user consent settings.' }),

    // ---- Microsoft 365 & security
    R({ id: 'service-health', category: 'm365', source: 'serviceHealth', name: 'Microsoft 365 service health',
      description: 'Current health of every service, including Intune and Entra ID.', summaryBy: 'status' }),
    R({ id: 'service-issues', category: 'm365', source: 'serviceIssues', name: 'Service incidents & advisories',
      description: 'Open and recent Microsoft incidents.', sort: { col: 'startDateTime', dir: 'desc' }, summaryBy: 'service' }),
    R({ id: 'message-center', category: 'm365', source: 'messageCenter', name: 'Message center (upcoming changes)',
      description: 'Announcements and upcoming changes from Microsoft.', sort: { col: 'lastModifiedDateTime', dir: 'desc' }, summaryBy: 'category' }),
    R({ id: 'secure-score', category: 'm365', source: 'secureScoreControls', name: 'Secure Score improvement actions',
      description: 'Every Secure Score recommendation with its maximum points and status.', sort: { col: 'maxScore', dir: 'desc' }, summaryBy: 'controlCategory' }),
    R({ id: 'security-alerts', category: 'm365', source: 'securityAlerts', name: 'Security alerts (Defender XDR)',
      description: 'Alerts from Microsoft Defender products.', sort: { col: 'createdDateTime', dir: 'desc' }, summaryBy: 'severity' }),
    R({ id: 'security-incidents', category: 'm365', source: 'securityIncidents', name: 'Security incidents (Defender XDR)',
      description: 'Incidents grouping related alerts.', sort: { col: 'createdDateTime', dir: 'desc' }, summaryBy: 'status' }),
    R({ id: 'domains', category: 'm365', source: 'entraDomains', name: 'Domains',
      description: 'Every domain on the tenant and whether it is verified.', summaryBy: 'isVerified' }),
    R({ id: 'intune-alerts', category: 'm365', source: 'g.monitoring.alertRecords', name: 'Intune alerts',
      description: 'Alerts raised by Intune monitoring rules.', sort: { col: 'detectedDateTime', dir: 'desc' } }),

    // ---- Windows 365
    R({ id: 'cloud-pcs', category: 'w365', source: 'g.virtualEndpoint.cloudPCs', name: 'Cloud PCs',
      description: 'Every Windows 365 Cloud PC, its user, plan and status.', summaryBy: 'status' }),
    R({ id: 'cloud-pc-connections', category: 'w365', source: 'g.virtualEndpoint.onPremisesConnections', name: 'Azure network connections',
      description: 'Network connections used by Cloud PCs and their health checks.', summaryBy: 'healthCheckStatus' }),
    R({ id: 'cloud-pc-policies', category: 'w365', source: 'g.virtualEndpoint.provisioningPolicies', name: 'Cloud PC provisioning policies',
      description: 'How Cloud PCs are created: image, join type and region.' }),
    R({ id: 'cloud-pc-images', category: 'w365', source: 'g.virtualEndpoint.deviceImages', name: 'Cloud PC custom images',
      description: 'Uploaded images and their status.' })
  ];

  // Friendly column names. Anything not listed is generated from the field name.
  const LABELS = {
    id: 'ID', deviceName: 'Device name', userDisplayName: 'User', userPrincipalName: 'User sign-in (UPN)',
    emailAddress: 'Email', operatingSystem: 'OS', osVersion: 'OS version', complianceState: 'Compliance',
    lastSyncDateTime: 'Last check-in', enrolledDateTime: 'Enrolled', manufacturer: 'Manufacturer', model: 'Model',
    serialNumber: 'Serial number', managedDeviceOwnerType: 'Ownership', isEncrypted: 'Encrypted',
    deviceEnrollmentType: 'Enrollment type', managementAgent: 'Managed by', azureADDeviceId: 'Entra device ID',
    deviceCategoryDisplayName: 'Device category', totalStorageSpaceInBytes: 'Total storage',
    freeStorageSpaceInBytes: 'Free storage', physicalMemoryInBytes: 'Memory (RAM)', wiFiMacAddress: 'Wi-Fi MAC',
    ethernetMacAddress: 'Ethernet MAC', imei: 'IMEI', phoneNumber: 'Phone number', jailBroken: 'Jailbroken',
    isSupervised: 'Supervised', autopilotEnrolled: 'Autopilot', joinType: 'Join type', skuFamily: 'Windows edition',
    enrollmentProfileName: 'Enrollment profile', displayName: 'Name', name: 'Name', description: 'Description',
    createdDateTime: 'Created', lastModifiedDateTime: 'Last modified', '@odata.type': 'Type', version: 'Version',
    publisher: 'Publisher', isAssigned: 'Assigned', platform: 'Platform', platforms: 'Platform',
    technologies: 'Technology', settingCount: 'Settings', deviceCount: 'Devices', sizeInByte: 'Size',
    groupTag: 'Group tag', enrollmentState: 'Enrollment state', deploymentProfileAssignmentStatus: 'Profile status',
    lastContactedDateTime: 'Last contacted', mail: 'Email', jobTitle: 'Job title', department: 'Department',
    officeLocation: 'Office', accountEnabled: 'Enabled', usageLocation: 'Usage location', userType: 'User type',
    groupTypes: 'Group type', securityEnabled: 'Security group', mailEnabled: 'Mail enabled',
    membershipRule: 'Dynamic membership rule', operatingSystemVersion: 'OS version', trustType: 'Join type',
    isCompliant: 'Compliant', isManaged: 'Managed', approximateLastSignInDateTime: 'Last sign-in',
    registrationDateTime: 'Registered', deviceId: 'Device ID', skuPartNumber: 'License', consumedUnits: 'Assigned',
    'prepaidUnits.enabled': 'Purchased', capabilityStatus: 'Status', appliesTo: 'Applies to',
    activityDateTime: 'When', 'actor.userPrincipalName': 'Changed by', activityType: 'Action', category: 'Area',
    activityResult: 'Result', componentName: 'Component', settingName: 'Setting', platformType: 'Platform',
    compliantDeviceCount: 'Compliant devices', nonCompliantDeviceCount: 'Failing devices',
    errorDeviceCount: 'Error devices', conflictDeviceCount: 'Conflict devices', unknownDeviceCount: 'Unknown devices',
    notApplicableDeviceCount: 'Not applicable', remediatedDeviceCount: 'Remediated devices',
    encryptionState: 'Encryption', encryptionReadinessState: 'Readiness', tpmSpecificationVersion: 'TPM version',
    encryptionPolicySettingState: 'Policy state', deviceType: 'Device type', runAsAccount: 'Runs as',
    fileName: 'File name', severity: 'Severity', lastDetectionDateTime: 'Last detected', priority: 'Priority',
    isGlobalScript: 'Microsoft-provided', deviceNameTemplate: 'Device name template',
    // Assignments
    itemType: 'What', itemName: 'Name', intent: 'Intent', targetMode: 'Include / exclude', target: 'Assigned to',
    targetKind: 'Target type', groupType: 'Group type', deviceMembers: 'Devices in group', userMembers: 'Users in group',
    filterName: 'Filter', filterMode: 'Filter mode', filterPlatform: 'Filter platform', filterRule: 'Filter rule',
    itemId: 'Item ID', groupId: 'Group ID', notifications: 'User notifications', availableFrom: 'Available from',
    deadline: 'Install deadline', emptyTarget: 'Reaches nobody',
    // App details & relationships
    appVersion: 'Version', sizeMB: 'Size (MB)', installCommandLine: 'Install command', uninstallCommandLine: 'Uninstall command',
    installContext: 'Installs as', restartBehavior: 'Restart behavior', detection: 'Detection rules', packageIdentifier: 'Package ID',
    requiredTargets: 'Required (groups)', availableTargets: 'Available (groups)', uninstallTargets: 'Uninstall (groups)',
    excludedTargets: 'Excluded (groups)', supersedesCount: 'Supersedes (apps)', supersededByCount: 'Superseded by (apps)',
    dependencyCount: 'Dependencies', publishingState: 'Publishing state',
    relationship: 'Relationship', sourceApp: 'App', sourceVersion: 'App version', targetApp: 'Other app',
    targetVersion: 'Other app version', how: 'Type', sourceDetection: 'App detection', targetDetection: 'Other app detection',
    detectionOverlap: 'Shared detection', atRisk: 'May not work',
    // Connectors
    connector: 'Connector', health: 'Health', expires: 'Expires', daysLeft: 'Days left', lastSync: 'Last sync', detail: 'Details',
    // BitLocker & LAPS
    bitlockerKey: 'BitLocker key in Entra ID', bitlockerKeyCount: 'Keys saved', lastKeyBackup: 'Last key saved',
    lapsPassword: 'LAPS password', lapsLastBackup: 'LAPS last backup',
    // Autopilot vs Entra
    entraStatus: 'Entra ID device', entraDeviceName: 'Entra device name', entraLastSignIn: 'Entra last sign-in',
    intuneEnrolled: 'Enrolled in Intune', azureActiveDirectoryDeviceId: 'Entra device ID',
    // App secrets & licenses per user
    objectType: 'Kind', appName: 'App', appId: 'Application (client) ID', credentialType: 'Credential', credentialName: 'Credential name',
    usage: 'Used for', startDateTime: 'Valid from', license: 'License', assignedBy: 'Assigned by', assignmentState: 'Assignment state',
    assignmentError: 'Assignment error', disabledPlans: 'Disabled service plans', lastUpdated: 'Last updated',
    // More device / user fields
    managementCertificateExpirationDate: 'Management certificate expires', partnerReportedThreatState: 'Threat state',
    chassisType: 'Chassis', processorArchitecture: 'Processor', employeeId: 'Employee ID', companyName: 'Company',
    mobilePhone: 'Mobile phone', onPremisesSyncEnabled: 'Synced from AD', lastPasswordChangeDateTime: 'Password last changed',
    onPremisesSamAccountName: 'AD account name', onPremisesDomainName: 'AD domain', onPremisesLastSyncDateTime: 'Last AD sync',
    passwordPolicies: 'Password policies', 'manager.displayName': 'Manager', isAssignableToRole: 'Can hold admin roles',
    'signInActivity.lastSuccessfulSignInDateTime': 'Last successful sign-in', 'signInActivity.lastSignInDateTime': 'Last interactive sign-in',
    'signInActivity.lastNonInteractiveSignInDateTime': 'Last non-interactive sign-in', 'roleDefinition.displayName': 'Role',
    'principal.displayName': 'Assigned to', 'principal.userPrincipalName': 'Assigned to (UPN)', isMfaRegistered: 'MFA registered',
    isAdmin: 'Admin', defaultMfaMethod: 'Default MFA method', methodsRegistered: 'Methods registered'
  };

  // Value translations for fields that hold codes.
  const VALUES = {
    complianceState: { compliant: 'Compliant', noncompliant: 'Not compliant', inGracePeriod: 'In grace period',
      unknown: 'Unknown', configManager: 'Config Manager', conflict: 'Conflict', error: 'Error' },
    managedDeviceOwnerType: { company: 'Corporate', personal: 'Personal', unknown: 'Unknown' },
    managementAgent: { mdm: 'Intune', eas: 'Exchange ActiveSync', easMdm: 'Intune + Exchange',
      configurationManagerClient: 'Configuration Manager', configurationManagerClientMdm: 'Co-managed (ConfigMgr + Intune)',
      intuneClient: 'Intune PC agent', jamf: 'Jamf', googleCloudDevicePolicyController: 'Google' },
    joinType: { azureADJoined: 'Entra joined', hybridAzureADJoined: 'Hybrid joined', azureADRegistered: 'Entra registered', unknown: 'Unknown' },
    trustType: { AzureAd: 'Entra joined', ServerAd: 'Hybrid joined', Workplace: 'Entra registered' },
    deviceEnrollmentType: { userEnrollment: 'User enrollment', deviceEnrollmentManager: 'Device enrollment manager',
      appleBulkWithUser: 'Apple ADE (with user)', appleBulkWithoutUser: 'Apple ADE (no user)',
      windowsAzureADJoin: 'Entra join', windowsBulkUserless: 'Windows bulk enrollment', windowsAutoEnrollment: 'Windows auto-enrollment',
      windowsBulkAzureDomainJoin: 'Windows bulk Entra join', windowsCoManagement: 'Co-management',
      windowsAzureADJoinUsingDeviceAuth: 'Entra join (Autopilot self-deploy)', appleUserEnrollment: 'Apple user enrollment',
      appleUserEnrollmentWithServiceAccount: 'Apple user enrollment (service account)',
      androidEnterpriseDedicatedDevice: 'Android dedicated', androidEnterpriseFullyManaged: 'Android fully managed',
      androidEnterpriseCorporateWorkProfile: 'Android corporate work profile', unknown: 'Unknown' },
    enrollmentState: { unknown: 'Unknown', enrolled: 'Enrolled', pendingReset: 'Pending reset', failed: 'Failed', notContacted: 'Not contacted', blocked: 'Blocked' },
    deploymentProfileAssignmentStatus: { unknown: 'Unknown', assigned: 'Assigned', assignedInSync: 'Assigned',
      assignedOutOfSync: 'Assigned (syncing)', assignedUnkownSyncState: 'Assigned', notAssigned: 'Not assigned', pending: 'Pending', failed: 'Failed' },
    groupTypes: { Unified: 'Microsoft 365', DynamicMembership: 'Dynamic' },
    runAsAccount: { system: 'System', user: 'User' },
    platform: { macOS: 'macOS', 'iOS/iPadOS': 'iOS/iPadOS' }
  };

  // Shown as coloured badges.
  const TONES = {
    complianceState: { compliant: 'ok', noncompliant: 'bad', inGracePeriod: 'warn', error: 'bad', conflict: 'warn' },
    enrollmentState: { enrolled: 'ok', failed: 'bad', notContacted: 'warn', blocked: 'bad' },
    encryptionState: { encrypted: 'ok', notEncrypted: 'bad' },
    activityResult: { Success: 'ok', Fail: 'bad', Failure: 'bad' },
    severity: { severe: 'bad', high: 'bad', moderate: 'warn', low: 'neutral' },
    jailBroken: { True: 'bad', False: 'ok' },
    capabilityStatus: { Enabled: 'ok', Suspended: 'warn', Deleted: 'bad', Warning: 'warn' },
    intent: { Required: 'ok', Uninstall: 'bad', Available: 'neutral', 'Available Without Enrollment': 'neutral' },
    targetMode: { Exclude: 'warn' },
    targetKind: { 'Deleted group': 'bad', 'All users': 'warn', 'All devices': 'warn', "Couldn't read": 'warn' },
    health: { OK: 'ok', 'Expires soon': 'warn', 'Not syncing': 'warn', Expired: 'bad', Error: 'bad' },
    bitlockerKey: { 'Backed up': 'ok', Missing: 'bad', 'Data drives only': 'warn' },
    lapsPassword: { 'Backed up': 'ok', Missing: 'warn' },
    atRisk: { true: 'bad', false: 'ok' },
    emptyTarget: { true: 'bad' },
    entraStatus: { OK: 'ok', 'Entra device missing': 'bad', 'Entra device disabled': 'warn', 'No Entra device linked': 'warn' }
  };

  // Code-like text fields that should be shown "Split Into Words" when no translation exists.
  const ENUM_FIELDS = ['deviceEnrollmentType', 'managementAgent', 'joinType', 'enrollmentState', 'deploymentProfileAssignmentStatus',
    'encryptionState', 'encryptionReadinessState', 'encryptionPolicySettingState', 'deviceType', 'platformType', 'platform',
    'platforms', 'technologies', 'severity', 'category', 'skuFamily', 'appliesTo', 'capabilityStatus', 'managedDeviceOwnerType',
    'complianceState', 'runAsAccount', 'state', 'status'];

  // Dates where "how long ago" matters.
  const RELATIVE_DATES = ['managementCertificateExpirationDate', 'lastPasswordChangeDateTime', 'lastSuccessfulSignInDateTime', 'lastSignInDateTime', 'lastNonInteractiveSignInDateTime', 'LastContact', 'LastCheckin', 'LastReportedDateTime', 'ValidTo', 'lastSyncDateTime', 'approximateLastSignInDateTime', 'lastContactedDateTime', 'lastDetectionDateTime', 'enrolledDateTime',
    'lastSync', 'lastKeyBackup', 'lapsLastBackup', 'entraLastSignIn', 'expires'];

  const ODATA_TYPES = {
    win32LobApp: 'Windows app (Win32)', winGetApp: 'Microsoft Store app', officeSuiteApp: 'Microsoft 365 Apps',
    windowsMicrosoftEdgeApp: 'Microsoft Edge', windowsMobileMSI: 'Windows MSI line-of-business', microsoftStoreForBusinessApp: 'Store for Business app',
    iosVppApp: 'iOS store app (VPP)', iosStoreApp: 'iOS store app', iosLobApp: 'iOS line-of-business',
    macOSVppApp: 'macOS store app (VPP)', macOSLobApp: 'macOS line-of-business', macOSPkgApp: 'macOS PKG', macOSDmgApp: 'macOS DMG',
    macOsVppApp: 'macOS store app (VPP)', macOSMicrosoftEdgeApp: 'Microsoft Edge (macOS)', macOSOfficeSuiteApp: 'Microsoft 365 Apps (macOS)',
    androidManagedStoreApp: 'Managed Google Play app', androidStoreApp: 'Android store app', androidLobApp: 'Android line-of-business',
    managedAndroidStoreApp: 'Managed Android store app', managedIOSStoreApp: 'Managed iOS store app', webApp: 'Web link',
    windowsWebApp: 'Windows web link', windowsUniversalAppX: 'Windows MSIX/AppX', windowsAppX: 'Windows AppX',
    iosManagedAppProtection: 'iOS app protection', androidManagedAppProtection: 'Android app protection',
    windowsManagedAppProtection: 'Windows app protection', mdmWindowsInformationProtectionPolicy: 'WIP (with enrollment)',
    windowsInformationProtectionPolicy: 'WIP (without enrollment)', targetedManagedAppConfiguration: 'App configuration',
    windows10CompliancePolicy: 'Windows 10/11', iosCompliancePolicy: 'iOS/iPadOS', macOSCompliancePolicy: 'macOS',
    androidWorkProfileCompliancePolicy: 'Android work profile', androidDeviceOwnerCompliancePolicy: 'Android Enterprise (corporate)',
    androidCompliancePolicy: 'Android device administrator', aospDeviceOwnerCompliancePolicy: 'Android (AOSP)',
    windowsPhone81CompliancePolicy: 'Windows Phone 8.1', windows81CompliancePolicy: 'Windows 8.1',
    windowsAutopilotDeploymentProfile: 'Autopilot profile', azureADWindowsAutopilotDeploymentProfile: 'Entra joined',
    activeDirectoryWindowsAutopilotDeploymentProfile: 'Hybrid joined',
    deviceEnrollmentPlatformRestrictionsConfiguration: 'Platform restrictions', deviceEnrollmentPlatformRestrictionConfiguration: 'Platform restriction',
    deviceEnrollmentLimitConfiguration: 'Device limit', deviceEnrollmentWindowsHelloForBusinessConfiguration: 'Windows Hello for Business',
    windows10EnrollmentCompletionPageConfiguration: 'Enrollment Status Page', deviceComanagementAuthorityConfiguration: 'Co-management authority',
    windowsRestoreDeviceEnrollmentConfiguration: 'Windows restore'
  };

  window.CATALOG = { PERMISSIONS, SOURCES, AREAS, CATEGORIES, REPORTS, LABELS, VALUES, TONES, ENUM_FIELDS, RELATIVE_DATES, ODATA_TYPES };
})();
