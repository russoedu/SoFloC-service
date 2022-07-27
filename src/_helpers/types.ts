export type CustomizationsT = {
  ImportExportXml: {
    Entities: string
    Roles: string
    Workflows: {
      Workflow: {
        JsonFileName: string
        Type: number
        Subprocess: number
        Category: number
        Mode: number
        Scope: number
        OnDemand: number
        TriggerOnCreate: number
        TriggerOnDelete: number
        AsyncAutodelete: number
        SyncWorkflowLogOnFailure: number
        StateCode: number
        StatusCode: number
        RunAs: number
        IsTransacted: number
        IntroducedVersion: number | string
        IsCustomizable: number
        BusinessProcessType?: number
        IsCustomProcessingStepAllowedForOtherPublishers: number
        PrimaryEntity: string
        LocalizedNames: {
          LocalizedName: string
        }
        UIFlowType?: number
      }[]
    }
    FieldSecurityProfiles: string
    Templates: string
    EntityMaps: string
    EntityRelationships: string
    OrganizationSettings: string
    optionsets: string
    CustomControls: string
    EntityDataProviders: string
    connectionreferences: {
      connectionreference: {
        connectionreferencedisplayname: string
        connectorid: string
        iscustomizable: number
        statecode: number
        statuscode: number
        description?: string
      }[]
    }
    Languages: {
      Language: number
    }
  }
}

interface LocalizedNames {
  LocalizedName: string
}

export type SolutionT = {
  ImportExportXml: {
    SolutionManifest: {
      UniqueName: string
      LocalizedNames: LocalizedNames
      Descriptions: {
        Description: string
      }
      Version: string
      Managed: number
      Publisher: {
        UniqueName: string
        LocalizedNames: LocalizedNames
        Descriptions: string
        EMailAddress: string
        SupportingWebsiteUrl: string
        CustomizationPrefix: string
        CustomizationOptionValuePrefix: number
        Addresses: {
          Address: {
            AddressNumber: number
            AddressTypeCode: string
            City: string
            County: string
            Country: string
            Fax: string
            FreightTermsCode: string
            ImportSequenceNumber: string
            Latitude: string
            Line1: string
            Line2: string
            Line3: string
            Longitude: string
            Name: string
            PostalCode: string
            PostOfficeBox: string
            PrimaryContactName: string
            ShippingMethodCode: string
            StateOrProvince: string
            Telephone1: string
            Telephone2: string
            Telephone3: string
            TimeZoneRuleVersionNumber: string
            UPSZone: string
            UTCOffset: string
            UTCConversionTimeZoneCode: string
          }[]
        }
      }
      RootComponents: {
        RootComponent: string[]
      }
      MissingDependencies: string
    }
  }
}
