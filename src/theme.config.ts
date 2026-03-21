import fs from "node:fs";
import path from "node:path";
import yaml from "yaml";

interface ThemeConfig {
  site: {
    url: string;
    title: string;
    author: string;
    description: string;
    favicon: string;
    pageSize?: number;
  };
  global: {
    avatar: string;
    rss: boolean;
    i18n: boolean;
    search?: boolean;
  };
  nav: { name: string; url: string }[];
  footer: {
    copyright: {
      owner: string;
      time: string;
    };
    beian: {
      icp: {
        enabled: boolean;
        number?: string;
      };
      police: {
        enabled: boolean;
        number?: string;
        url?: string;
      };
    };
  };
  index: {
    social: {
      name: string;
      enabled: boolean;
      url?: string;
    }[];
  };
  post: {
    toc?: boolean;
    readingTime?: boolean;
    copyright: {
      CCLicense: {
        BY: boolean;
        NC: boolean;
        SA: boolean;
        ND: boolean;
      };
      url: string;
    };
  };
  sponsor: {
    enabled: boolean;
    alipay: {
      enabled: boolean;
      image?: string;
    };
    wechat: {
      enabled: boolean;
      image?: string;
    };
    list: boolean;
  };
  comment: {
    enabled: boolean;
    artalk: {
      enabled: boolean;
      server?: string;
      site?: string;
    };
  };
  tools: {
    umami: {
      enabled: boolean;
      src: string;
      websiteID: string;
    };
  };
}

const file = path.resolve("src/config/theme.yaml");
export const themeConfig: ThemeConfig = yaml.parse(fs.readFileSync(file, "utf8"));
