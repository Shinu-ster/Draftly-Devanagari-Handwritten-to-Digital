declare module "next-pwa" {
  import { NextConfig } from "next";
  function withPWA(config: any): (NextConfig: NextConfig) => NextConfig;
  export default withPWA;
}
