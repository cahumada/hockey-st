"use client";

import { useEffect } from "react";
import {
  Controller,
  useForm,
  type FieldErrors,
  type Resolver,
  type UseFormRegisterReturn,
  type UseFormReturn,
} from "react-hook-form";
import { CategorySelect } from "@/components/category-select";
import type { PlayerFormErrors } from "@/app/(protected)/players/actions";
import type { RosterCategory } from "@/lib/roster";
import {
  playerToProfileFormValues,
  validatePlayerProfileFormValues,
  type PlayerProfileFormValues,
} from "@/lib/player-profile-form";
import { cn } from "cn";

const fieldClass =
  "h-11 w-full rounded-lg border border-input bg-background px-3 text-sm";

export function usePlayerProfileForm({
  player,
  categories,
  dniStorageReady,
  serverErrors,
}: {
  player: Parameters<typeof playerToProfileFormValues>[0];
  categories: readonly RosterCategory[];
  dniStorageReady: boolean;
  serverErrors?: PlayerFormErrors;
}) {
  const categoryCodes = categories.map((category) => category.code);
  const fallbackCategory = categories[0]?.code ?? "";

  const resolver: Resolver<PlayerProfileFormValues> = (values) =>
    resolveProfileForm(values, categoryCodes, dniStorageReady);

  const form = useForm<PlayerProfileFormValues>({
    mode: "onTouched",
    reValidateMode: "onChange",
    defaultValues: playerToProfileFormValues(player, fallbackCategory),
    resolver,
  });

  const resetKey =
    player !== null && "id" in player && typeof player.id === "string" ? player.id : "create";

  useEffect(() => {
    form.reset(playerToProfileFormValues(player, fallbackCategory));
  }, [resetKey, fallbackCategory, form, player]);

  useEffect(() => {
    if (!serverErrors) {
      return;
    }

    for (const [field, message] of Object.entries(serverErrors) as [
      keyof PlayerProfileFormValues,
      string | undefined,
    ][]) {
      if (!message) {
        continue;
      }

      form.setError(field, { type: "server", message });
    }
  }, [form, serverErrors]);

  return form;
}

function resolveProfileForm(
  values: PlayerProfileFormValues,
  categoryCodes: readonly string[],
  dniStorageReady: boolean,
): ReturnType<Resolver<PlayerProfileFormValues>> {
  const validated = validatePlayerProfileFormValues(values, categoryCodes, {
    dniStorageReady,
  });

  if (!validated.ok) {
    return {
      values: {},
      errors: toFieldErrors(validated.errors),
    };
  }

  return { values, errors: {} };
}

function toFieldErrors(errors: PlayerFormErrors): FieldErrors<PlayerProfileFormValues> {
  const mapped: FieldErrors<PlayerProfileFormValues> = {};

  for (const [field, message] of Object.entries(errors) as [
    keyof PlayerProfileFormValues,
    string | undefined,
  ][]) {
    if (message) {
      mapped[field] = { type: "validate", message };
    }
  }

  return mapped;
}

export function PlayerProfileFormFields({
  form,
  formId,
  player,
  categories,
  dniStorageReady,
}: {
  form: UseFormReturn<PlayerProfileFormValues>;
  formId: string;
  player: {
    dniMasked: string | null;
  } | null;
  categories: readonly RosterCategory[];
  dniStorageReady: boolean;
}) {
  const {
    register,
    control,
    formState: { errors },
  } = form;

  return (
    <form id={formId} className="flex flex-col gap-3" noValidate>
      <TextField
        id="modal-displayName"
        label="Alias"
        required
        error={errors.displayName?.message}
        registration={register("displayName", { required: true })}
      />
      <div className="grid gap-3 sm:grid-cols-2">
        <TextField
          id="modal-givenName"
          label="Nombre"
          error={errors.givenName?.message}
          registration={register("givenName")}
        />
        <TextField
          id="modal-familyName"
          label="Apellido"
          error={errors.familyName?.message}
          registration={register("familyName")}
        />
      </div>
      <Controller
        name="categoryCode"
        control={control}
        render={({ field }) => (
          <>
            <CategorySelect
              id="modal-categoryCode"
              name={field.name}
              categories={categories}
              value={field.value}
              invalid={Boolean(errors.categoryCode)}
              onBlur={field.onBlur}
              onValueChange={(next) => field.onChange(next)}
            />
            <FieldError message={errors.categoryCode?.message} />
          </>
        )}
      />

      <fieldset className="flex flex-col gap-3 rounded-xl border border-border/70 p-4">
        <legend className="px-1 text-sm font-medium">Datos opcionales</legend>
        <div className="grid gap-3 sm:grid-cols-2">
          <TextField
            id="modal-birthDate"
            label="Fecha de nacimiento"
            type="date"
            error={errors.birthDate?.message}
            registration={register("birthDate")}
          />
          <TextField
            id="modal-joinedOn"
            label="Fecha de ingreso"
            type="date"
            error={errors.joinedOn?.message}
            registration={register("joinedOn")}
          />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <TextField
            id="modal-membershipNumber"
            label="Número de socio"
            error={errors.membershipNumber?.message}
            registration={register("membershipNumber")}
          />
          <TextField
            id="modal-jerseyNumber"
            label="Número de camiseta"
            inputMode="numeric"
            error={errors.jerseyNumber?.message}
            registration={register("jerseyNumber")}
          />
        </div>
        <label className="flex flex-col gap-1" htmlFor="modal-dni">
          DNI
          <input
            id="modal-dni"
            autoComplete="off"
            placeholder={player?.dniMasked ?? "7 u 8 dígitos"}
            className={cn(fieldClass, errors.dni && "border-destructive")}
            aria-invalid={errors.dni ? true : undefined}
            {...register("dni")}
          />
          {player?.dniMasked ? (
            <span className="text-xs text-muted-foreground">
              Registrado como {player.dniMasked}. Dejá vacío para mantenerlo.
            </span>
          ) : (
            <span className="text-xs text-muted-foreground">Se guarda cifrado en el servidor.</span>
          )}
          {!dniStorageReady ? (
            <span className="text-xs text-muted-foreground">
              El registro de DNI no está habilitado en este entorno.
            </span>
          ) : null}
          <FieldError message={errors.dni?.message} />
        </label>
      </fieldset>
    </form>
  );
}

function TextField({
  id,
  label,
  registration,
  error,
  required = false,
  type = "text",
  inputMode,
}: {
  id: string;
  label: string;
  registration: UseFormRegisterReturn<keyof PlayerProfileFormValues>;
  error?: string;
  required?: boolean;
  type?: string;
  inputMode?: "numeric" | "text";
}) {
  return (
    <label className="flex flex-col gap-1" htmlFor={id}>
      {label}
      <input
        id={id}
        type={type}
        required={required}
        inputMode={inputMode}
        className={cn(fieldClass, error && "border-destructive")}
        aria-invalid={error ? true : undefined}
        {...registration}
      />
      <FieldError message={error} />
    </label>
  );
}

function FieldError({ message }: { message?: string }) {
  if (!message) {
    return null;
  }

  return <span className="text-sm text-destructive">{message}</span>;
}
