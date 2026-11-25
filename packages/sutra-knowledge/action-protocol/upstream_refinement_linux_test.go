//go:build linux

package actionprotocol

import (
	"encoding/json"
	"os"
	"testing"
)

type upstreamRefinementEvent struct {
	Op            string `json:"op"`
	State         string `json:"state"`
	TerminalCount uint32 `json:"terminalCount"`
	EffectCount   uint32 `json:"effectCount"`
}
type upstreamRefinementScenario struct {
	Name   string                    `json:"name"`
	Events []upstreamRefinementEvent `json:"events"`
}
type upstreamRefinementTrace struct {
	Profile   string                       `json:"profile"`
	Limit     uint32                       `json:"limit"`
	Scenarios []upstreamRefinementScenario `json:"scenarios"`
}

func upstreamTraceState(t *testing.T, u *upstreamEffectAuthority, reservation FenceReservation, op string) upstreamRefinementEvent {
	t.Helper()
	status, e := u.Status(reservation)
	if e != nil {
		t.Fatal("trace status", op, e)
	}
	terminal, effects, e := u.Counts()
	if e != nil {
		t.Fatal("trace counts", op, e)
	}
	state := ""
	switch status.State {
	case upstreamApplied:
		state = "applied"
	case upstreamClosed:
		state = "closed"
	default:
		t.Fatal("trace terminal state", status.State)
	}
	return upstreamRefinementEvent{Op: op, State: state, TerminalCount: terminal, EffectCount: effects}
}

func TestUpstreamEffectAuthorityRefinementTrace(t *testing.T) {
	const origin = "http://127.0.0.1:19116"
	trace := upstreamRefinementTrace{Profile: "SUTRA/upstream-terminal-refinement/v1", Limit: 1}

	ctx, _, authorityKey, _, _, applied := upstreamFixture(t, origin, 1)
	appliedReservation := signedUpstreamReservation(t, ctx, authorityKey, Digest{90}, Digest{91}, Digest{92}, Digest{93})
	applyScenario := upstreamRefinementScenario{Name: "apply", Events: []upstreamRefinementEvent{
		{Op: "init", State: "none", TerminalCount: 0, EffectCount: 0},
	}}
	first, e := applied.Apply(appliedReservation)
	if e != nil {
		t.Fatal(e)
	}
	applyScenario.Events = append(applyScenario.Events, upstreamTraceState(t, applied, appliedReservation, "apply"))
	second, e := applied.Apply(appliedReservation)
	if e != nil || second != first {
		t.Fatal("applied retry", e)
	}
	applyScenario.Events = append(applyScenario.Events, upstreamTraceState(t, applied, appliedReservation, "retry-applied"))
	if _, e = applied.Status(appliedReservation); e != nil {
		t.Fatal("applied status", e)
	}
	applyScenario.Events = append(applyScenario.Events, upstreamTraceState(t, applied, appliedReservation, "status"))
	if e = applied.Close(); e != nil {
		t.Fatal(e)
	}
	trace.Scenarios = append(trace.Scenarios, applyScenario)

	ctx, authorityPub, authorityKey, upstreamPub, _, closed := upstreamFixture(t, origin, 1)
	closedReservation := signedUpstreamReservation(t, ctx, authorityKey, Digest{94}, Digest{95}, Digest{96}, Digest{97})
	closeScenario := upstreamRefinementScenario{Name: "close", Events: []upstreamRefinementEvent{
		{Op: "init", State: "none", TerminalCount: 0, EffectCount: 0},
	}}
	proof, e := closed.CloseUnapplied(closedReservation)
	if e != nil || !VerifyEffectClosureProof(proof, ctx, authorityPub, closedReservation, upstreamPub) {
		t.Fatal("close", e)
	}
	closeScenario.Events = append(closeScenario.Events, upstreamTraceState(t, closed, closedReservation, "close-unapplied"))
	again, e := closed.CloseUnapplied(closedReservation)
	if e != nil || again != proof {
		t.Fatal("closed retry", e)
	}
	closeScenario.Events = append(closeScenario.Events, upstreamTraceState(t, closed, closedReservation, "retry-closed"))
	if _, e = closed.Status(closedReservation); e != nil {
		t.Fatal("closed status", e)
	}
	closeScenario.Events = append(closeScenario.Events, upstreamTraceState(t, closed, closedReservation, "status"))
	if e = closed.Close(); e != nil {
		t.Fatal(e)
	}
	trace.Scenarios = append(trace.Scenarios, closeScenario)

	if path := os.Getenv("SUTRA_UPSTREAM_TRACE"); path != "" {
		raw, e := json.MarshalIndent(trace, "", "  ")
		if e != nil {
			t.Fatal(e)
		}
		if e = os.WriteFile(path, append(raw, '\n'), 0600); e != nil {
			t.Fatal(e)
		}
	}
	t.Log("actual APPLIED and CLOSED Go traces exported for independent bounded transition checking")
}
