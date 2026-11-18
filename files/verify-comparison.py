import json
from pathlib import Path
import subprocess

workspace = Path(__file__).resolve().parent
baseline = 'd88d44c4e8dedd1bf69682d3d2abcf4116dad3c4'
predecessor = '183eef356bf1fd5eec173f2e5cbf27f3564ca0f7'
name = 'oncall.responders.list'
legacy_reads = ['oncall.alerts.list', 'oncall.triage.list', 'oncall.analytics.read']


def git(*args):
    return subprocess.check_output(['git', *args], text=True).strip()


def manifest(ref):
    return {row['name']: row['clauses'] for row in json.loads(git('show', ref+':agent-surface.json'))['tools']}


original_associations = manifest(predecessor+'^')
corrected_associations = {tool: clauses for tool, clauses in manifest(predecessor).items()
                          if original_associations[tool] != clauses}
assert len(corrected_associations) == 10
for ref in [baseline, 'HEAD']:
    assert all(manifest(ref)[tool] == clauses for tool, clauses in corrected_associations.items())

comparisons = []
for policy in ['autonomous', 'held']:
    before = json.loads((workspace/f'before.{policy}.json').read_text())
    after = json.loads((workspace/f'after.{policy}.json').read_text())
    assert before['contractHasResponder'] is False and after['contractHasResponder'] is True
    assert before['missingToolNames'] == [name] and after['missingToolNames'] == []
    for field in ['responder','tools','nativeAndPagingUnchanged','outboundRequests']:
        assert before[field] == after[field], (policy,field)
    assert after['nativeAndPagingUnchanged'] and after['outboundRequests'] == 0
    tools = {row['name']: row['_meta'] for row in after['tools']}
    assert len(tools) == len(after['tools']) and all(tool in tools for tool in legacy_reads)
    for tool, clauses in corrected_associations.items():
        assert tools[tool]['com.runeditrun/clauses'] == clauses, (policy,tool)
    for tool in legacy_reads:
        assert tools[tool]['com.runeditrun/clauses'] == manifest('HEAD')[tool]
    comparisons.append(dict(policy=policy, emittedToolCount=len(tools), beforeMissingToolNames=[name],
                            afterMissingToolNames=[], responder=after['responder'], unchangedInventoryMetadata=True,
                            nativeAndPagingUnchanged=True, outboundRequests=0))

receipt = dict(before=baseline, after=git('rev-parse','HEAD'), predecessors=dict(
    alerts='4a72738', triage='acabbc2', analytics='0c0619c', integration='8976d00',
    clauseCorrections=predecessor), priorCoreClauseAssociations=corrected_associations,
    comparisons=comparisons)
(workspace/'packet'/'comparison-receipt.json').write_text(json.dumps(receipt,indent=2)+'\n')
print(f"PASS metadata diff: {len(comparisons)} policies, {comparisons[0]['emittedToolCount']} tools, one documentation row reconciled")
