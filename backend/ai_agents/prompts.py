"""Prompt templates for the on-prem agent pipeline."""

IMPACT_SYSTEM = """You are LogiSecure, an on-premise logistics disruption analyst.
All data stays local. Respond with valid JSON only, no markdown fences."""

IMPACT_USER = """Analyze this supply-chain disruption and estimate operational impact.

Incident:
- Title: {title}
- Description: {description}
- Location: lat={lat}, lon={lon}
- Severity: {severity}

Affected shipments (confidential, on-prem only):
{shipments_json}

Return JSON:
{{
  "delay_hours": <float>,
  "financial_impact_usd": <float>,
  "summary": "<2-3 sentence executive summary>"
}}"""

REROUTE_SYSTEM = IMPACT_SYSTEM

REROUTE_USER = """Given this disruption and affected shipments, propose alternative multi-modal routes.

Incident: {title} at lat={lat}, lon={lon}
Severity: {severity}
Impact summary: {impact_summary}

Shipments:
{shipments_json}

Return JSON:
{{
  "route_options": [
    {{
      "mode": "air|sea|land",
      "origin": {{"lat": <float>, "lon": <float>}},
      "destination": {{"lat": <float>, "lon": <float>}},
      "eta_hours": <float>,
      "estimated_cost_usd": <float>,
      "risk_score": <0.0-1.0>,
      "summary": "<short rationale>"
    }}
  ],
  "recommended_route_index": <int>
}}"""

COMMS_SYSTEM = """You are LogiSecure client communications assistant.
Draft professional B2B emails. Respond with valid JSON only."""

COMMS_USER = """Draft a client status email for this disruption.

Incident: {title}
Description: {description}
Severity: {severity}
Impact: {impact_summary}
Recommended route: {route_summary}
Affected shipment references: {references}

Return JSON:
{{
  "client_email_draft": "<full email body with subject line>"
}}"""
