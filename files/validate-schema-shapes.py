"""Validate only public synthetic responses against the reviewed OpenAPI schema.
Author: Run Edit Run fleet, 2026-11-17 UTC. No network or credentials.
Usage: python3 validate-schema-shapes.py SCHEMA FIXTURE_DIRECTORY RECEIPT
"""
import hashlib,json,sys,warnings
from pathlib import Path
warnings.filterwarnings('ignore',category=DeprecationWarning)
from jsonschema import Draft4Validator,RefResolver
schema_file,fixture,receipt=map(Path,sys.argv[1:])
raw=schema_file.read_bytes();schema=json.loads(raw)
manifest=json.loads((fixture/'manifest.json').read_text());account=json.loads((fixture/'account.json').read_text())
assert hashlib.sha256(raw).hexdigest()==manifest['schema']['sha256']
# OpenAPI 3.0 nullable is an extension to its JSON Schema dialect.
def nullable(value):
 if isinstance(value,list):return [nullable(child) for child in value]
 if not isinstance(value,dict):return value
 out={key:nullable(child) for key,child in value.items()}
 if out.get('nullable') and 'type' in out:out['type']=[out['type'],'null']
 return out
schema=nullable(schema);resolver=RefResolver.from_schema(schema);rows=[]
for kind,endpoint in manifest['endpoints'].items():
 responses=schema['paths'][endpoint[4:]]['get']['responses'];response=responses.get('200',responses.get('201'))
 if '$ref' in response:response=resolver.resolve(response['$ref'])[1]
 validator=Draft4Validator(response['content']['application/json']['schema'],resolver=resolver)
 errors=[]
 for index,page in enumerate(account[kind]):
  errors.extend({'page':index,'pointer':'/'+('/'.join(str(key) for key in error.absolute_path)),'message':error.message} for error in validator.iter_errors(page))
 rows.append({'kind':kind,'endpoint':endpoint,'responses':len(account[kind]),'schemaErrors':errors})
result={'schemaSha256':manifest['schema']['sha256'],'fixtureSha256':manifest['sha256'],'objects':manifest['objects'],'responseCount':sum(row['responses'] for row in rows),'errors':sum(len(row['schemaErrors']) for row in rows),'rows':rows,'limits':'Public documented response shapes only; no account reads, provider availability, production delivery or full migration claim. The deliberate unknown future_setting is allowed by the public schema and must remain an explicit import gap.'}
receipt.write_text(json.dumps(result,indent=2)+'\n');print(json.dumps({key:result[key] for key in ('schemaSha256','fixtureSha256','objects','responseCount','errors')}))
raise SystemExit(bool(result['errors']))
