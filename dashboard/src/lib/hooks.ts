"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "./api";

export const queryKeys = {
	keys: ["keys"] as const,
	models: ["models"] as const,
	catalog: ["catalog"] as const,
	credentials: ["credentials"] as const,
	usage: (from: string, to: string) => ["usage", from, to] as const,
	balance: ["balance"] as const,
};

export function useKeys() {
	return useQuery({ queryKey: queryKeys.keys, queryFn: () => api.getKeys() });
}

export function useCreateKey() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: (name: string) => api.createKey(name),
		onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.keys }),
	});
}

export function useDeleteKey() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: (id: string) => api.deleteKey(id),
		onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.keys }),
	});
}

export function useModels() {
	return useQuery({ queryKey: queryKeys.models, queryFn: () => api.getModels() });
}

export function useCatalog() {
	return useQuery({ queryKey: queryKeys.catalog, queryFn: () => api.getCatalog() });
}

export function useCredentials() {
	return useQuery({
		queryKey: queryKeys.credentials,
		queryFn: () => api.getCredentials(),
	});
}

export function useCreateCredential() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: (input: { provider: string; apiKey: string }) =>
			api.createCredential(input.provider, input.apiKey),
		onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.credentials }),
	});
}

export function useDeleteCredential() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: (id: string) => api.deleteCredential(id),
		onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.credentials }),
	});
}

export function useUsage(from: string, to: string) {
	return useQuery({
		queryKey: queryKeys.usage(from, to),
		queryFn: () => api.getUsage(from, to),
	});
}

export function useBalance() {
	return useQuery({
		queryKey: queryKeys.balance,
		queryFn: () => api.getBalance(),
	});
}
