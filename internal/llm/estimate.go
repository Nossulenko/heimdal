package llm

import "unicode/utf8"

// EstimateTokens is a deliberately rough heuristic (~4 characters per token)
// used only as a fallback when an upstream does not report usage. Counts
// produced this way must be marked Usage.Estimated = true so billing and
// analytics can distinguish them from provider-reported numbers.
func EstimateTokens(s string) int {
	if s == "" {
		return 0
	}
	n := utf8.RuneCountInString(s) / 4
	if n < 1 {
		return 1
	}
	return n
}

// EstimatePromptTokens sums an estimate across all messages in a request.
func EstimatePromptTokens(msgs []Message) int {
	total := 0
	for _, m := range msgs {
		// +4 rough per-message overhead (role, delimiters), matching common
		// tokenizer behavior closely enough for a fallback.
		total += EstimateTokens(m.Content) + 4
	}
	return total
}
