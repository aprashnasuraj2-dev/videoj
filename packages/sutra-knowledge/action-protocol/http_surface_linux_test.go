//go:build linux

package actionprotocol

import (
	"net/http"
	"reflect"
	"testing"
)

func TestExternalHTTPWriteSurfaceRequiresAnchoredFencedComposite(t *testing.T) {
	handler := reflect.TypeOf((*http.Handler)(nil)).Elem()

	lowerEffectLayers := []any{
		(*Receiver)(nil),
		(*DurableReceiver)(nil),
		(*SharedAuthority)(nil),
		(*WitnessCoordinator)(nil),
		(*GrantGuard)(nil),
		(*FencedGrantGuard)(nil),
		(*FencedCoordinator)(nil),
		(*upstreamEffectAuthority)(nil),
		(*upstreamTransactionCoordinator)(nil),
	}
	for _, layer := range lowerEffectLayers {
		typ := reflect.TypeOf(layer)
		if typ.Implements(handler) {
			t.Fatalf("lower effect layer remains externally mountable as http.Handler: %v", typ)
		}
	}

	composite := reflect.TypeOf((*AnchoredFencedGrantGuard)(nil))
	if !composite.Implements(handler) {
		t.Fatalf("anchored fenced-grant composite lost its deliberate HTTP surface: %v", composite)
	}
	for _, method := range []string{"Commit", "Status", "ProcessAttested"} {
		if _, exposed := composite.MethodByName(method); exposed {
			t.Fatalf("unpinned composite method remains exported: %s", method)
		}
	}

	// Separately keyed control-plane state machines remain independently
	// hostable, but none owns or commits the authority effect.
	for _, control := range []any{
		(*AdmissionFence)(nil),
		(*AuthorityWitness)(nil),
		(*GrantPolicyWitness)(nil),
	} {
		typ := reflect.TypeOf(control)
		if !typ.Implements(handler) {
			t.Fatalf("independent control-plane handler unexpectedly unavailable: %v", typ)
		}
	}
}
