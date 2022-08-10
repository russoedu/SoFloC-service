
interface EMailAddress {
  _attributes: {
    'xsi:nil': string,
  },
}
interface LocalizedName {
  _attributes: {
    description: string,
    languagecode: string,
  },
}

interface LocalizedNames {
  LocalizedName: LocalizedName,
}

interface Text {
  _text: string,
}

export interface SolutionXml {
  ImportExportXml: {
    _attributes: {
      version: string,
      SolutionPackageVersion: string,
      languagecode: string,
      generatedBy: string,
      'xmlns:xsi': string,
    },
    SolutionManifest: {
      UniqueName: Text,
      LocalizedNames: LocalizedNames,
      Descriptions: {
        Description: LocalizedName,
      },
      Version: Text,
      Managed: Text,
      Publisher: {
        UniqueName: Text,
        LocalizedNames: LocalizedNames,
        Descriptions: any,
        EMailAddress: EMailAddress,
        SupportingWebsiteUrl: EMailAddress,
        CustomizationPrefix: Text,
        CustomizationOptionValuePrefix: Text,
        Addresses: {
          Address: {
            AddressNumber: Text,
            AddressTypeCode: EMailAddress,
            City: EMailAddress,
            County: EMailAddress,
            Country: EMailAddress,
            Fax: EMailAddress,
            FreightTermsCode: EMailAddress,
            ImportSequenceNumber: EMailAddress,
            Latitude: EMailAddress,
            Line1: EMailAddress,
            Line2: EMailAddress,
            Line3: EMailAddress,
            Longitude: EMailAddress,
            Name: EMailAddress,
            PostalCode: EMailAddress,
            PostOfficeBox: EMailAddress,
            PrimaryContactName: EMailAddress,
            ShippingMethodCode: EMailAddress,
            StateOrProvince: EMailAddress,
            Telephone1: EMailAddress,
            Telephone2: EMailAddress,
            Telephone3: EMailAddress,
            TimeZoneRuleVersionNumber: EMailAddress,
            UPSZone: EMailAddress,
            UTCOffset: EMailAddress,
            UTCConversionTimeZoneCode: EMailAddress,
          }[],
        },
      },
      RootComponents: {
        RootComponent: {
          _attributes: {
            type: string,
            id: string,
            behavior: string,
          },
        }[],
      },
      MissingDependencies: any,
    },
  },
}
