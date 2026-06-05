import React, { useState } from 'react';
import yaml from 'js-yaml';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Plus, FileText, Settings, Shield, Server, Database, Upload } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import ApiInfoForm from '@/components/ApiInfoForm';
import ServerForm from '@/components/ServerForm';
import PathBuilder from '@/components/PathBuilder';
import SchemaBuilder from '@/components/SchemaBuilder';
import SecurityBuilder from '@/components/SecurityBuilder';
import YamlPreview from '@/components/YamlPreview';
import Navbar from "@/components/Navbar";
import DocToYamlConverter from "@/components/DocToYamlConverter";
import { useAuth } from "../utils/AuthContext";

export interface ApiInfo {
  title: string;
  description: string;
  version: string;
  contact?: {
    name?: string;
    email?: string;
    url?: string;
  };
}

export interface Server {
  url: string;
  description: string;
}

export interface Parameter {
  name: string;
  in: 'query' | 'header' | 'path' | 'cookie';
  required: boolean;
  description: string;
  schema: {
    type: string;
  };
  'x-zia-agent-param-type'?: string;
}

export interface Response {
  statusCode: string;
  description: string;
  content?: {
    'application/json'?: {
      schema?: any;
    };
  };
}

export interface Operation {
  summary: string;
  description: string;
  operationId: string;
  tags: string[];
  security: any[];
  parameters: Parameter[];
  requestBody?: {
    required: boolean;
    content: {
      'application/json': {
        schema: any;
      };
    };
  };
  responses: Response[];
}

export interface Path {
  path: string;
  methods: {
    [key: string]: Operation;
  };
}

export interface Schema {
  name: string;
  type: 'object';
  properties: {
    [key: string]: {
      type: string;
      description: string;
      'x-zia-agent-param-type'?: string;
    };
  };
  required: string[];
}

export interface SecurityScheme {
  name: string;
  type: 'oauth2' | 'http' | 'apiKey';
  scheme?: string;
  bearerFormat?: string;
  flows?: any;
  scopes?: { [key: string]: string };
}

const Index = () => {
  const { user } = useAuth();
  const [apiInfo, setApiInfo] = useState<ApiInfo>({
    title: '',
    description: '',
    version: '1.0.0'
  });
  
  const [servers, setServers] = useState<Server[]>([]);
  const [paths, setPaths] = useState<Path[]>([]);
  const [schemas, setSchemas] = useState<Schema[]>([]);
  const [securitySchemes, setSecuritySchemes] = useState<SecurityScheme[]>([]);
  const [globalSecurity, setGlobalSecurity] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState('info');
  const [importYaml, setImportYaml] = useState('');

  const generateYaml = () => {
    const openApiSpec = {
      openapi: '3.0.0',
      info: apiInfo,
      servers,
      paths: paths.reduce((acc, path) => {
        acc[path.path] = path.methods;
        return acc;
      }, {} as any),
      components: {
        schemas: schemas.reduce((acc, schema) => {
          acc[schema.name] = {
            type: schema.type,
            properties: schema.properties,
            required: schema.required
          };
          return acc;
        }, {} as any),
        securitySchemes: securitySchemes.reduce((acc, scheme) => {
          acc[scheme.name] = {
            type: scheme.type,
            ...(scheme.scheme && { scheme: scheme.scheme }),
            ...(scheme.bearerFormat && { bearerFormat: scheme.bearerFormat }),
            ...(scheme.flows && { flows: scheme.flows }),
          };
          return acc;
        }, {} as any)
      },
      ...(globalSecurity.length > 0 && { security: globalSecurity })
    };

    return openApiSpec;
  };

  const applyYaml = (yamlString: string) => {
    try {
      const parsedYaml = yaml.load(yamlString) as any;
      
      if (!parsedYaml || typeof parsedYaml !== 'object') {
        throw new Error('Invalid YAML format');
      }

      // Import API Info
      if (parsedYaml.info) {
        setApiInfo({
          title: parsedYaml.info.title || '',
          description: parsedYaml.info.description || '',
          version: parsedYaml.info.version || '1.0.0',
          contact: parsedYaml.info.contact || undefined
        });
      }

      // Import Servers
      if (parsedYaml.servers && Array.isArray(parsedYaml.servers)) {
        const importedServers = parsedYaml.servers.map((server: any) => ({
          url: server.url || '',
          description: server.description || ''
        }));
        setServers(importedServers);
      }

      // Import Security Schemes
      if (parsedYaml.components?.securitySchemes) {
        const importedSecuritySchemes: SecurityScheme[] = [];
        
        Object.entries(parsedYaml.components.securitySchemes).forEach(([name, scheme]: [string, any]) => {
          const securityScheme: SecurityScheme = {
            name,
            type: scheme.type || 'http',
            scheme: scheme.scheme,
            bearerFormat: scheme.bearerFormat,
            flows: scheme.flows,
            scopes: {}
          };

          // Extract scopes from flows if it's OAuth2
          if (scheme.type === 'oauth2' && scheme.flows) {
            Object.values(scheme.flows).forEach((flow: any) => {
              if (flow.scopes) {
                securityScheme.scopes = { ...securityScheme.scopes, ...flow.scopes };
              }
            });
          }

          importedSecuritySchemes.push(securityScheme);
        });
        
        setSecuritySchemes(importedSecuritySchemes);
      }

      // Import Schemas
      if (parsedYaml.components?.schemas) {
        const importedSchemas: Schema[] = [];
        
        Object.entries(parsedYaml.components.schemas).forEach(([name, schema]: [string, any]) => {
          if (schema.type === 'object' && schema.properties) {
            const importedSchema: Schema = {
              name,
              type: 'object',
              properties: {},
              required: schema.required || []
            };

            Object.entries(schema.properties).forEach(([propName, prop]: [string, any]) => {
              importedSchema.properties[propName] = {
                type: prop.type || 'string',
                description: prop.description || '',
                'x-zia-agent-param-type': prop['x-zia-agent-param-type']
              };
            });

            importedSchemas.push(importedSchema);
          }
        });
        
        setSchemas(importedSchemas);
      }

      // Import Paths
      if (parsedYaml.paths) {
        const importedPaths: Path[] = [];
        
        Object.entries(parsedYaml.paths).forEach(([pathUrl, methods]: [string, any]) => {
          const pathObj: Path = {
            path: pathUrl,
            methods: {}
          };

          Object.entries(methods).forEach(([httpMethod, operation]: [string, any]) => {
            const importedOperation: Operation = {
              summary: operation.summary || '',
              description: operation.description || '',
              operationId: operation.operationId || '',
              tags: operation.tags || [],
              security: operation.security || [],
              parameters: [],
              responses: []
            };

            // Import parameters
            if (operation.parameters && Array.isArray(operation.parameters)) {
              importedOperation.parameters = operation.parameters.map((param: any) => ({
                name: param.name || '',
                in: param.in || 'query',
                required: param.required || false,
                description: param.description || '',
                schema: param.schema || { type: 'string' },
                'x-zia-agent-param-type': param['x-zia-agent-param-type']
              }));
            }

            // Import request body
            if (operation.requestBody) {
              importedOperation.requestBody = {
                required: operation.requestBody.required || false,
                content: {
                  'application/json': {
                    schema: operation.requestBody.content?.['application/json']?.schema || { type: 'object' }
                  }
                }
              };
            }

            // Import responses
            if (operation.responses) {
              Object.entries(operation.responses).forEach(([statusCode, response]: [string, any]) => {
                importedOperation.responses.push({
                  statusCode,
                  description: response.description || '',
                  content: response.content
                });
              });
            }

            pathObj.methods[httpMethod] = importedOperation;
          });

          importedPaths.push(pathObj);
        });
        
        setPaths(importedPaths);
      }

      // Import Global Security
      if (parsedYaml.security && Array.isArray(parsedYaml.security)) {
        setGlobalSecurity(parsedYaml.security);
      }

      toast({
        title: "Success!",
        description: "YAML imported successfully! All components have been populated.",
      });
      setActiveTab('info');

    } catch (error) {
      console.error('YAML Import Error:', error);
      toast({
        title: "Import Error",
        description: `Failed to parse YAML: ${error instanceof Error ? error.message : 'Invalid format'}`,
        variant: "destructive"
      });
    }
  };

  const importFromYaml = () => {
    if (!importYaml.trim()) {
      toast({ title: "Error", description: "Please paste your YAML content first", variant: "destructive" });
      return;
    }
    applyYaml(importYaml);
    setImportYaml('');
  };

  const updateGlobalSecurity = (schemes: SecurityScheme[]) => {
    // Create global security based on available schemes
    const security = schemes.map(scheme => {
      if (scheme.type === 'oauth2' && scheme.scopes) {
        return { [scheme.name]: Object.keys(scheme.scopes) };
      }
      return { [scheme.name]: [] };
    });
    setGlobalSecurity(security);
  };

  // Update global security when security schemes change
  React.useEffect(() => {
    updateGlobalSecurity(securitySchemes);
  }, [securitySchemes]);

  return (    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <Navbar />

      {/* Existing YAML Studio Content */}
      <div className="container mx-auto p-4">
        <div className="grid gap-4">
          <div className="mb-8 text-center">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-4">
              OpenAPI YAML Generator
            </h1>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Create comprehensive OpenAPI specifications with an intuitive form-based interface. 
              No more manual YAML writing!
            </p>
            <div className="flex justify-center gap-2 mt-4">
              <Badge variant="secondary" className="bg-blue-100 text-blue-700">
                <FileText className="w-3 h-3 mr-1" />
                OpenAPI 3.0.0
              </Badge>
              <Badge variant="secondary" className="bg-green-100 text-green-700">
                <Plus className="w-3 h-3 mr-1" />
                Form Builder
              </Badge>
              <Badge variant="secondary" className="bg-purple-100 text-purple-700">
                <Settings className="w-3 h-3 mr-1" />
                Live Preview
              </Badge>
            </div>
          </div>

          {/* AI Doc Converter */}
          <DocToYamlConverter onYamlGenerated={applyYaml} />

          {/* YAML Import Section */}
          <Card className="mb-6 shadow-lg border-0 bg-white/80 backdrop-blur-sm">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2">
                <Upload className="w-5 h-5 text-purple-600" />
                Import Existing YAML
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                value={importYaml}
                onChange={(e) => setImportYaml(e.target.value)}
                placeholder="Paste your existing OpenAPI YAML here to import and edit..."
                className="min-h-[120px] font-mono text-sm"
              />
              <div className="flex gap-2">
                <Button onClick={importFromYaml} className="flex-1">
                  <Upload className="w-4 h-4 mr-2" />
                  Import YAML
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => setImportYaml('')}
                  className="flex-1"
                >
                  Clear
                </Button>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-6">
              <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-2">
                    <Settings className="w-5 h-5 text-blue-600" />
                    API Configuration
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                    <TabsList className="grid w-full grid-cols-5">
                      <TabsTrigger value="info" className="text-xs">Info</TabsTrigger>
                      <TabsTrigger value="servers" className="text-xs">Servers</TabsTrigger>
                      <TabsTrigger value="paths" className="text-xs">Paths</TabsTrigger>
                      <TabsTrigger value="schemas" className="text-xs">Schemas</TabsTrigger>
                      <TabsTrigger value="security" className="text-xs">Security</TabsTrigger>
                    </TabsList>
                    
                    <TabsContent value="info" className="mt-4">
                      <div className="flex items-center gap-2 mb-4">
                        <FileText className="w-4 h-4 text-blue-600" />
                        <h3 className="font-semibold">API Information</h3>
                      </div>
                      <ApiInfoForm apiInfo={apiInfo} setApiInfo={setApiInfo} />
                    </TabsContent>
                    
                    <TabsContent value="servers" className="mt-4">
                      <div className="flex items-center gap-2 mb-4">
                        <Server className="w-4 h-4 text-green-600" />
                        <h3 className="font-semibold">Server Configuration</h3>
                      </div>
                      <ServerForm servers={servers} setServers={setServers} />
                    </TabsContent>
                    
                    <TabsContent value="paths" className="mt-4">
                      <div className="flex items-center gap-2 mb-4">
                        <Plus className="w-4 h-4 text-purple-600" />
                        <h3 className="font-semibold">API Endpoints</h3>
                      </div>
                      <PathBuilder 
                        paths={paths} 
                        setPaths={setPaths}
                        schemas={schemas}
                        securitySchemes={securitySchemes}
                      />
                    </TabsContent>
                    
                    <TabsContent value="schemas" className="mt-4">
                      <div className="flex items-center gap-2 mb-4">
                        <Database className="w-4 h-4 text-orange-600" />
                        <h3 className="font-semibold">Data Schemas</h3>
                      </div>
                      <SchemaBuilder schemas={schemas} setSchemas={setSchemas} />
                    </TabsContent>
                    
                    <TabsContent value="security" className="mt-4">
                      <div className="flex items-center gap-2 mb-4">
                        <Shield className="w-4 h-4 text-red-600" />
                        <h3 className="font-semibold">Security Schemes</h3>
                      </div>
                      <SecurityBuilder 
                        securitySchemes={securitySchemes} 
                        setSecuritySchemes={setSecuritySchemes} 
                      />
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>
            </div>

            <div className="space-y-6">
              <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="w-5 h-5 text-green-600" />
                    YAML Preview
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <YamlPreview spec={generateYaml()} />
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
