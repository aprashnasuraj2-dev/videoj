//go:build linux

package actionprotocol

import (
	"encoding/json"
	"errors"
	"os"
	"path/filepath"
	"testing"
)

type upstreamWitnessRefinementEvent struct {
	Op              string `json:"op"`
	Result          string `json:"result"`
	Terminal        string `json:"terminal"`
	StoreVersion    uint32 `json:"storeVersion"`
	WitnessVersion  uint32 `json:"witnessVersion"`
	Intent          bool   `json:"intent"`
	PhysicalEffects uint32 `json:"physicalEffects"`
}

type upstreamWitnessRefinementScenario struct {
	Name   string                           `json:"name"`
	Events []upstreamWitnessRefinementEvent `json:"events"`
}

type upstreamWitnessRefinementTrace struct {
	Profile   string                              `json:"profile"`
	Limit     uint32                              `json:"limit"`
	Scenarios []upstreamWitnessRefinementScenario `json:"scenarios"`
}

func upstreamWitnessTraceState(t *testing.T, f *upstreamWitnessFixture, op, result string, physical uint32) upstreamWitnessRefinementEvent {
	t.Helper()
	view, e := f.client.View()
	if e != nil {
		t.Fatal("trace witness view", op, e)
	}
	info, e := os.Lstat(f.coordinator.intentPath())
	intent := e == nil
	if e != nil && !errors.Is(e, os.ErrNotExist) {
		t.Fatal("trace intent", op, e)
	}
	if intent && (!info.Mode().IsRegular() || info.Mode().Perm()&0077 != 0) {
		t.Fatal("trace intent shape", op, info.Mode())
	}
	if len(f.upstream.records) > 1 {
		t.Fatal("trace store exceeds bounded refinement profile", op, len(f.upstream.records))
	}
	terminal := "none"
	if len(f.upstream.records) == 1 {
		if f.upstream.records[0].state != upstreamApplied {
			t.Fatal("trace profile only models APPLIED receiver state", op, f.upstream.records[0].state)
		}
		terminal = "applied"
	}
	if view.Sequence > 1 {
		t.Fatal("trace witness exceeds bounded refinement profile", op, view.Sequence)
	}
	return upstreamWitnessRefinementEvent{
		Op: op, Result: result, Terminal: terminal,
		StoreVersion: uint32(len(f.upstream.records)), WitnessVersion: view.Sequence,
		Intent: intent, PhysicalEffects: physical,
	}
}

func TestUpstreamWitnessCoordinatorRefinementTrace(t *testing.T) {
	trace := upstreamWitnessRefinementTrace{Profile: "SUTRA/upstream-witness-refinement/v1", Limit: 1}

	t.Run("normal", func(t *testing.T) {
		f := newUpstreamWitnessFixture(t, 1)
		r := signedUpstreamReservation(t, f.ctx, f.authorityKey, Digest{101}, Digest{102}, Digest{103}, Digest{104})
		physical := uint32(0)
		s := upstreamWitnessRefinementScenario{Name: "normal"}
		s.Events = append(s.Events, upstreamWitnessTraceState(t, f, "init", "ready", physical))
		f.coordinator.fault = func(at string) error {
			switch at {
			case "upstream-witness-after-intent":
				s.Events = append(s.Events, upstreamWitnessTraceState(t, f, "prepare", "prepared", physical))
			case "upstream-witness-after-store":
				physical++
				s.Events = append(s.Events, upstreamWitnessTraceState(t, f, "apply-store", "applied", physical))
			}
			return nil
		}
		receipt, e := f.coordinator.Apply(r)
		if e != nil || receipt.EffectSequence != 1 {
			t.Fatal("normal witnessed apply", e, receipt.EffectSequence)
		}
		f.coordinator.fault = nil
		s.Events = append(s.Events, upstreamWitnessTraceState(t, f, "advance-witness", "success", physical))
		trace.Scenarios = append(trace.Scenarios, s)
	})

	t.Run("store-ahead-recovery", func(t *testing.T) {
		f := newUpstreamWitnessFixture(t, 1)
		r := signedUpstreamReservation(t, f.ctx, f.authorityKey, Digest{111}, Digest{112}, Digest{113}, Digest{114})
		physical := uint32(0)
		s := upstreamWitnessRefinementScenario{Name: "store-ahead-recovery"}
		s.Events = append(s.Events, upstreamWitnessTraceState(t, f, "init", "ready", physical))
		f.coordinator.fault = func(at string) error {
			switch at {
			case "upstream-witness-after-intent":
				s.Events = append(s.Events, upstreamWitnessTraceState(t, f, "prepare", "prepared", physical))
			case "upstream-witness-after-store":
				physical++
				s.Events = append(s.Events, upstreamWitnessTraceState(t, f, "apply-store", "applied-unknown", physical))
				return errors.New("inject restart before witness CAS")
			}
			return nil
		}
		if _, e := f.coordinator.Apply(r); !errors.Is(e, ErrUnknown) {
			t.Fatal("store-ahead seam did not remain unknown", e)
		}
		_ = f.upstream.Close()
		reopened, e := openUpstreamEffectAuthorityStore(f.upstreamDir, f.ctx, f.authorityPub, f.upstreamKey, 1)
		if e != nil {
			t.Fatal(e)
		}
		f.upstream = reopened
		f.coordinator, e = newUpstreamWitnessCoordinator(reopened, f.client)
		if e != nil {
			t.Fatal(e)
		}
		s.Events = append(s.Events, upstreamWitnessTraceState(t, f, "restart", "restarted", physical))
		if e = f.coordinator.Recover(); e != nil {
			t.Fatal("store-ahead recovery", e)
		}
		s.Events = append(s.Events, upstreamWitnessTraceState(t, f, "recover-store-ahead", "reconciled", physical))
		trace.Scenarios = append(trace.Scenarios, s)
	})

	t.Run("receiver-only-rollback", func(t *testing.T) {
		f := newUpstreamWitnessFixture(t, 1)
		initial, e := os.ReadFile(filepath.Join(f.upstreamDir, "upstream.bin"))
		if e != nil {
			t.Fatal(e)
		}
		r := signedUpstreamReservation(t, f.ctx, f.authorityKey, Digest{121}, Digest{122}, Digest{123}, Digest{124})
		physical := uint32(0)
		s := upstreamWitnessRefinementScenario{Name: "receiver-only-rollback"}
		s.Events = append(s.Events, upstreamWitnessTraceState(t, f, "init", "ready", physical))
		f.coordinator.fault = func(at string) error {
			switch at {
			case "upstream-witness-after-intent":
				s.Events = append(s.Events, upstreamWitnessTraceState(t, f, "prepare", "prepared", physical))
			case "upstream-witness-after-store":
				physical++
				s.Events = append(s.Events, upstreamWitnessTraceState(t, f, "apply-store", "applied", physical))
			}
			return nil
		}
		if _, e = f.coordinator.Apply(r); e != nil {
			t.Fatal(e)
		}
		f.coordinator.fault = nil
		s.Events = append(s.Events, upstreamWitnessTraceState(t, f, "advance-witness", "success", physical))
		_ = f.upstream.Close()
		if e = os.WriteFile(filepath.Join(f.upstreamDir, "upstream.bin"), initial, 0600); e != nil {
			t.Fatal(e)
		}
		reopened, e := openUpstreamEffectAuthorityStore(f.upstreamDir, f.ctx, f.authorityPub, f.upstreamKey, 1)
		if e != nil {
			t.Fatal(e)
		}
		f.upstream = reopened
		f.coordinator, e = newUpstreamWitnessCoordinator(reopened, f.client)
		if e != nil {
			t.Fatal(e)
		}
		s.Events = append(s.Events, upstreamWitnessTraceState(t, f, "rollback-store", "rolled-back", physical))
		if e = f.coordinator.Recover(); !errors.Is(e, ErrWitnessRollback) {
			t.Fatal("receiver-only rollback was not refused", e)
		}
		s.Events = append(s.Events, upstreamWitnessTraceState(t, f, "recover-refused", "rollback-refused", physical))
		trace.Scenarios = append(trace.Scenarios, s)
	})

	if path := os.Getenv("SUTRA_UPSTREAM_WITNESS_TRACE"); path != "" {
		raw, e := json.MarshalIndent(trace, "", "  ")
		if e != nil {
			t.Fatal(e)
		}
		if e = os.WriteFile(path, append(raw, '\n'), 0600); e != nil {
			t.Fatal(e)
		}
	}
	t.Log("actual upstream witness normal, store-ahead restart recovery and receiver-only rollback-refusal traces exported")
}
