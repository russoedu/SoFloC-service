/* istanbul ignore file */
interface Attributes {
  'xmlns:xsi': string,
}

interface Text {
  _text: string,
}
export interface CustomisationsXml {
  ImportExportXml: {
    _attributes: Attributes,
    Entities: any,
    Roles: any,
    Workflows: {
      Workflow: {
        _attributes: {
          WorkflowId: string,
          Name: string,
        },
        JsonFileName: Text,
        Type: Text,
        Subprocess: Text,
        Category: Text,
        Mode: Text,
        Scope: Text,
        OnDemand: Text,
        TriggerOnCreate: Text,
        TriggerOnDelete: Text,
        AsyncAutodelete: Text,
        SyncWorkflowLogOnFailure: Text,
        StateCode: Text,
        StatusCode: Text,
        RunAs: Text,
        IsTransacted: Text,
        IntroducedVersion: Text,
        IsCustomizable: Text,
        BusinessProcessType?: Text,
        IsCustomProcessingStepAllowedForOtherPublishers: Text,
        PrimaryEntity: Text,
        LocalizedNames: {
          LocalizedName: {
            _attributes: {
              languagecode: string,
              description: string,
            },
          },
        },
        UIFlowType?: Text,
      }[],
    },
    FieldSecurityProfiles: any,
    Templates: any,
    EntityMaps: any,
    EntityRelationships: any,
    OrganizationSettings: any,
    optionsets: any,
    CustomControls: any,
    EntityDataProviders: any,
    connectionreferences: {
      connectionreference: {
        _attributes: {
          connectionreferencelogicalname: string,
        },
        connectionreferencedisplayname: Text,
        connectorid: Text,
        iscustomizable: Text,
        statecode: Text,
        statuscode: Text,
        description?: Text,
      }[],
    },
    Languages: {
      Language: Text,
    },
  },
}
