/**
 * controllerCustomizer — Phase 4 Layer 2 diff applier (50.md §6 / §11 D5).
 *
 * Layer 1 (Phase 1-3 rule-based inference) produces a `WifiControllerSchema`
 * with REQUIRED fields populated and `WidgetCustomization` optional fields
 * left undefined. Layer 2 (this module + AI chat) merges a
 * `CustomizationDiff` from the AI into the schema, populating only the
 * customization fields. The bundle JS reads optional fields and falls back
 * to plain rendering when undefined → forward compatibility.
 *
 * Diff semantics:
 *  - schemaLevel customization is shallow-merged onto schema.customization.
 *  - widgets[] customization is matched by widget id (channelId), shallow-
 *    merged onto each matched widget. Unknown ids are reported, not applied
 *    (no silent invent-id behavior).
 *  - colorScheme is shallow-merged separately (so a partial { accent: ... }
 *    diff doesn't drop existing bg/fg).
 *  - All schema structural fields (channelId, dataType, label, min, max)
 *    are NOT modifiable through diff — `validateCustomizationDiff`
 *    rejects any keys outside `WidgetCustomization`.
 */
import type {
  WifiControllerSchema,
  WidgetCustomization,
  WifiWidgetDefinition,
} from './types';

export interface CustomizationDiff {
  schemaLevel?: WidgetCustomization;
  widgets?: Array<{ id: string } & WidgetCustomization>;
}

export interface ApplyDiffResult {
  schema: WifiControllerSchema;
  /** Diff entries whose `id` did not match any widget in the schema. */
  unknownIds: string[];
}

export function applyCustomizationDiff(
  schema: WifiControllerSchema,
  diff: CustomizationDiff,
): ApplyDiffResult {
  const next: WifiControllerSchema = { ...schema };

  // schema-level customization merge
  if (diff.schemaLevel) {
    next.customization = mergeCustomization(schema.customization, diff.schemaLevel);
  }

  // widget-level customization merge
  const unknownIds: string[] = [];
  if (diff.widgets && diff.widgets.length > 0) {
    // Build id → location index for O(1) lookup
    const widgetById = new Map<string, { deviceIdx: number; widgetIdx: number }>();
    schema.devices.forEach((device, dIdx) => {
      device.widgets.forEach((widget, wIdx) => {
        widgetById.set(widget.id, { deviceIdx: dIdx, widgetIdx: wIdx });
      });
    });

    // Clone devices + widgets array shells (immutable update)
    next.devices = schema.devices.map((d) => ({ ...d, widgets: [...d.widgets] }));

    for (const widgetDiff of diff.widgets) {
      const loc = widgetById.get(widgetDiff.id);
      if (!loc) {
        unknownIds.push(widgetDiff.id);
        continue;
      }
      const target = next.devices[loc.deviceIdx].widgets[loc.widgetIdx];
      const { id: _id, ...customFields } = widgetDiff;
      // Discriminated union preserved by spreading target first; merged
      // customization fields overwrite the optional slot only.
      next.devices[loc.deviceIdx].widgets[loc.widgetIdx] = {
        ...target,
        ...mergeCustomization(target, customFields),
      } as WifiWidgetDefinition;
    }
  }

  return { schema: next, unknownIds };
}

/**
 * Shallow-merge customization fields from `patch` onto `base`. `colorScheme`
 * is shallow-merged separately so a partial { accent } patch retains the
 * other channel colors.
 */
function mergeCustomization(
  base: WidgetCustomization | undefined,
  patch: WidgetCustomization,
): WidgetCustomization {
  const merged: WidgetCustomization = { ...(base ?? {}), ...patch };
  if (patch.colorScheme || base?.colorScheme) {
    merged.colorScheme = { ...(base?.colorScheme ?? {}), ...(patch.colorScheme ?? {}) };
  }
  return merged;
}
