
interface UniqueName {
  '$t': string;
}

interface EMailAddress {
  'xsi:nil': boolean;
}
interface Managed {
  '$t': number;
}

interface LocalizedName {
  description: string;
  languagecode: number;
}

interface LocalizedNames {
  LocalizedName: LocalizedName;
}
interface Type {
  '$t': number;
}

interface JsonFileName {
  '$t': string;
}

export interface SolutionT {
  ImportExportXml: {
    version: string;
    SolutionPackageVersion: number;
    languagecode: number;
    generatedBy: string;
    'xmlns:xsi': string;
    SolutionManifest: {
      UniqueName: UniqueName;
      LocalizedNames: LocalizedNames;
      Descriptions: {
        Description: LocalizedName;
      };
      Version: UniqueName;
      Managed: Managed;
      Publisher: {
        UniqueName: UniqueName;
        LocalizedNames: LocalizedNames;
        Descriptions: any;
        EMailAddress: EMailAddress;
        SupportingWebsiteUrl: EMailAddress;
        CustomizationPrefix: UniqueName;
        CustomizationOptionValuePrefix: Managed;
        Addresses: {
          Address: {
            AddressNumber: Managed;
            AddressTypeCode: EMailAddress;
            City: EMailAddress;
            County: EMailAddress;
            Country: EMailAddress;
            Fax: EMailAddress;
            FreightTermsCode: EMailAddress;
            ImportSequenceNumber: EMailAddress;
            Latitude: EMailAddress;
            Line1: EMailAddress;
            Line2: EMailAddress;
            Line3: EMailAddress;
            Longitude: EMailAddress;
            Name: EMailAddress;
            PostalCode: EMailAddress;
            PostOfficeBox: EMailAddress;
            PrimaryContactName: EMailAddress;
            ShippingMethodCode: EMailAddress;
            StateOrProvince: EMailAddress;
            Telephone1: EMailAddress;
            Telephone2: EMailAddress;
            Telephone3: EMailAddress;
            TimeZoneRuleVersionNumber: EMailAddress;
            UPSZone: EMailAddress;
            UTCOffset: EMailAddress;
            UTCConversionTimeZoneCode: EMailAddress;
          }[];
        };
      };
      RootComponents: {
        RootComponent: {
          type: number;
          id: string;
          behavior: number;
        }[];
      };
      MissingDependencies: any;
    };
  };
}

export interface CustomisationsT {
  ImportExportXml: {
    'xmlns:xsi': string;
    Entities: any;
    Roles: any;
    Workflows: {
      Workflow: {
        WorkflowId: string;
        Name: string;
        JsonFileName: JsonFileName;
        Type: Type;
        Subprocess: Type;
        Category: Type;
        Mode: Type;
        Scope: Type;
        OnDemand: Type;
        TriggerOnCreate: Type;
        TriggerOnDelete: Type;
        AsyncAutodelete: Type;
        SyncWorkflowLogOnFailure: Type;
        StateCode: Type;
        StatusCode: Type;
        RunAs: Type;
        IsTransacted: Type;
        IntroducedVersion: {
          '$t': number | string;
        };
        IsCustomizable: Type;
        BusinessProcessType?: Type;
        IsCustomProcessingStepAllowedForOtherPublishers: Type;
        PrimaryEntity: JsonFileName;
        LocalizedNames: LocalizedNames;
        UIFlowType?: Type;
      }[];
    };
    FieldSecurityProfiles: any;
    Templates: any;
    EntityMaps: any;
    EntityRelationships: any;
    OrganizationSettings: any;
    optionsets: any;
    CustomControls: any;
    EntityDataProviders: any;
    connectionreferences: {
      connectionreference: {
        connectionreferencelogicalname: string;
        connectionreferencedisplayname: JsonFileName;
        connectorid: JsonFileName;
        iscustomizable: Type;
        statecode: Type;
        statuscode: Type;
        description?: JsonFileName;
      }[];
    };
    Languages: {
      Language: Type;
    };
  };
}

export type Xml = string

export type Workflow = {
  name: string,
  id: string,
  fileIndex: number
}

export type CopyT = {
  originGui: string,
  upperOriginGui: string,
  guid: string,
  upperGuid: string,
  name: string,
  fileName: string,
  newVersion: string,
  newSnakeVersion: string,
}
