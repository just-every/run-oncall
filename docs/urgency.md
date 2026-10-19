# Urgency and support hours

Open **Services**, then **Urgency policy** on a service. Admins can publish a constant high or low rule, use severity, or choose weekly support windows in an IANA time zone. A publication needs a reason and creates a version with its author and time. Stale drafts are refused; reload the service before publishing again.

The severity default maps critical and error to high, warning and info to low, and missing or unknown severity to high. Support windows use the local date and clock at the evaluated instant, including daylight-saving changes. Start is inclusive, end exclusive. End may be 24:00. Enter local holiday dates explicitly; these use the outside-hours urgency. Multiple daily windows can be entered in the advanced JSON control, with day 0 for Sunday through 6 for Saturday. Overlapping windows are refused.

Use **Preview urgency without changes** with a UTC instant and severity to inspect the draft. It writes no records. The preview includes the rule version and the reason for its decision. A responder or viewer previews the current published rule. Routing replay also compares historical and proposed urgency beside its service coordination decision.

Every newly admitted event keeps its urgency decision and exact rule. An active alert can rise when a later trigger evaluates high. A later low decision does not silently lower an already high alert. In **Alerts**, expand **Change alert urgency**, choose high or low and enter a reason. Responders and admins can save that decision; stale revisions are refused. The alert shows its human and rule history. A duplicate event preserves the original admission and creates no second transition.

Native archives, checkpoints and portable transfers retain service policies, admission decisions and attributed alert history. Legacy records without urgency remain readable. Restoring an archive does not re-evaluate admissions, run a timer or deliver notifications.

Paging is OFF. Support hours apply at admission. Oncall has no timer, so a low alert is not raised automatically when support hours begin: the alert says so and shows the next support start, and you can raise it by hand. Per-channel notification rules, low-urgency escalation, phone delivery and push delivery are not implemented. Keep an existing paging system for those obligations.
