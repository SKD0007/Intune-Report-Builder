/* Copyright 2026 Orynr LLC. Developed by Sai Kamal Doss (SKDOSS).
   Licensed under the Apache License, Version 2.0 (see LICENSE and NOTICE).
   SPDX-License-Identifier: Apache-2.0 */
/* Report catalog: data sources, ready-made reports, friendly column names and
   value translations. Edit this file to add or tweak built-in reports. */
(function () {
  const DEVICE_FIELDS = [
    'id', 'deviceName', 'userDisplayName', 'userPrincipalName', 'emailAddress', 'operatingSystem', 'osVersion',
    'complianceState', 'lastSyncDateTime', 'enrolledDateTime', 'manufacturer', 'model', 'serialNumber',
    'managedDeviceOwnerType', 'isEncrypted', 'deviceEnrollmentType', 'managementAgent', 'azureADDeviceId',
    'deviceCategoryDisplayName', 'totalStorageSpaceInBytes', 'freeStorageSpaceInBytes', 'wiFiMacAddress',
    'ethernetMacAddress', 'imei', 'phoneNumber', 'jailBroken', 'isSupervised', 'autopilotEnrolled', 'joinType',
    'skuFamily', 'enrollmentProfileName', 'physicalMemoryInBytes'
  ];

  const P = {
    devices: 'DeviceManagementManagedDevices.Read.All',
    config: 'DeviceManagementConfiguration.Read.All',
    apps: 'DeviceManagementApps.Read.All',
    service: 'DeviceManagementServiceConfig.Read.All',
    users: 'User.Read.All',
    groups: 'Group.Read.All',
    entraDevices: 'Device.Read.All',
    org: 'Organization.Read.All'
  };

  // What each permission unlocks (shown on the Settings page).
  const PERMISSIONS = [
    { name: P.devices, unlocks: 'Managed devices, discovered apps, malware' },
    { name: P.config, unlocks: 'Compliance & configuration policies, scripts, encryption' },
    { name: P.apps, unlocks: 'Apps, app protection, Intune audit log' },
    { name: P.service, unlocks: 'Autopilot devices & enrollment settings' },
    { name: P.users, unlocks: 'Users' },
    { name: P.groups, unlocks: 'Groups' },
    { name: P.entraDevices, unlocks: 'Entra ID devices' },
    { name: P.org, unlocks: 'Licenses' }
  ];

  // Where data comes from. `permission` may be a list: any one of them is enough.
  const SOURCES = {
    devices: {
      name: 'Intune managed devices', icon: 'device', permission: P.devices,
      description: 'Every device enrolled in Intune: owner, OS, compliance, hardware.',
      path: '/deviceManagement/managedDevices?$select=' + DEVICE_FIELDS.join(','),
      columns: ['deviceName', 'userDisplayName', 'operatingSystem', 'osVersion', 'complianceState', 'lastSyncDateTime', 'model', 'serialNumber']
    },
    entraDevices: {
      name: 'Entra ID devices', icon: 'device', permission: P.entraDevices,
      description: 'All devices registered or joined in Entra ID (Azure AD).',
      path: '/devices?$select=id,displayName,operatingSystem,operatingSystemVersion,trustType,accountEnabled,isCompliant,isManaged,approximateLastSignInDateTime,registrationDateTime,manufacturer,model,deviceId',
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
      path: '/deviceAppManagement/mobileApps?$select=id,displayName,publisher,isAssigned,createdDateTime,lastModifiedDateTime',
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
      path: '/deviceManagement/configurationPolicies?$select=id,name,description,platforms,technologies,settingCount,isAssigned,createdDateTime,lastModifiedDateTime',
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
      path: '/users?$select=id,displayName,userPrincipalName,mail,jobTitle,department,officeLocation,accountEnabled,userType,createdDateTime,usageLocation',
      columns: ['displayName', 'userPrincipalName', 'jobTitle', 'department', 'accountEnabled', 'userType']
    },
    groups: {
      name: 'Groups', icon: 'users', permission: [P.groups, 'Directory.Read.All'],
      description: 'All Entra ID groups.',
      path: '/groups?$select=id,displayName,description,mail,groupTypes,securityEnabled,mailEnabled,membershipRule,createdDateTime',
      columns: ['displayName', 'description', 'groupTypes', 'securityEnabled', 'membershipRule']
    },
    licenses: {
      name: 'Licenses', icon: 'key', permission: [P.org, 'Directory.Read.All'],
      description: 'Microsoft licenses the organization owns and how many are used.',
      path: '/subscribedSkus',
      columns: ['skuPartNumber', 'prepaidUnits.enabled', 'consumedUnits', 'capabilityStatus', 'appliesTo']
    },
    auditLog: {
      name: 'Intune audit log (30 days)', icon: 'clock',
      permission: [P.apps, P.config, P.devices, P.service, 'DeviceManagementRBAC.Read.All'],
      description: 'Who changed what in Intune over the last 30 days.',
      path: '/deviceManagement/auditEvents?$filter=activityDateTime ge {daysAgo:30}',
      columns: ['activityDateTime', 'actor.userPrincipalName', 'displayName', 'activityType', 'category', 'activityResult']
    }
  };

  const CATEGORIES = [
    { id: 'devices', name: 'Devices', icon: 'device' },
    { id: 'security', name: 'Compliance & security', icon: 'shield' },
    { id: 'config', name: 'Configuration', icon: 'sliders' },
    { id: 'apps', name: 'Apps', icon: 'apps' },
    { id: 'enrollment', name: 'Enrollment & Autopilot', icon: 'rocket' },
    { id: 'directory', name: 'Users, groups & licenses', icon: 'users' },
    { id: 'activity', name: 'Activity', icon: 'clock' }
  ];

  const R = (o) => o;
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

    // ---- Apps
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
      description: 'Who changed what in Intune and when.', sort: { col: 'activityDateTime', dir: 'desc' }, summaryBy: 'category' })
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
    isGlobalScript: 'Microsoft-provided', deviceNameTemplate: 'Device name template'
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
    runAsAccount: { system: 'System', user: 'User' }
  };

  // Shown as coloured badges.
  const TONES = {
    complianceState: { compliant: 'ok', noncompliant: 'bad', inGracePeriod: 'warn', error: 'bad', conflict: 'warn' },
    enrollmentState: { enrolled: 'ok', failed: 'bad', notContacted: 'warn', blocked: 'bad' },
    encryptionState: { encrypted: 'ok', notEncrypted: 'bad' },
    activityResult: { Success: 'ok', Fail: 'bad', Failure: 'bad' },
    severity: { severe: 'bad', high: 'bad', moderate: 'warn', low: 'neutral' },
    jailBroken: { True: 'bad', False: 'ok' },
    capabilityStatus: { Enabled: 'ok', Suspended: 'warn', Deleted: 'bad', Warning: 'warn' }
  };

  // Code-like text fields that should be shown "Split Into Words" when no translation exists.
  const ENUM_FIELDS = ['deviceEnrollmentType', 'managementAgent', 'joinType', 'enrollmentState', 'deploymentProfileAssignmentStatus',
    'encryptionState', 'encryptionReadinessState', 'encryptionPolicySettingState', 'deviceType', 'platformType', 'platform',
    'platforms', 'technologies', 'severity', 'category', 'skuFamily', 'appliesTo', 'capabilityStatus', 'managedDeviceOwnerType',
    'complianceState', 'runAsAccount', 'state', 'status'];

  // Dates where "how long ago" matters.
  const RELATIVE_DATES = ['lastSyncDateTime', 'approximateLastSignInDateTime', 'lastContactedDateTime', 'lastDetectionDateTime', 'enrolledDateTime'];

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

  window.CATALOG = { PERMISSIONS, SOURCES, CATEGORIES, REPORTS, LABELS, VALUES, TONES, ENUM_FIELDS, RELATIVE_DATES, ODATA_TYPES };
})();
