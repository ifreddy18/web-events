"use client"

import { ChevronsUpDownIcon } from "lucide-react"
import { useState } from "react"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import type { SelectGroup } from "@/shared/time-zones"

/**
 * Searchable single-choice selector (popover + command list). It renders a hidden input named `name`,
 * so it works inside forms that read `FormData` like the native `<select>` fields around it.
 * The trigger is a button with `role="combobox"`; give it `id` and point a `<label htmlFor>` at it.
 */
export function SearchableSelect({
  id,
  name,
  groups,
  defaultValue,
  placeholder = "Select…",
  searchPlaceholder = "Search…",
  emptyMessage = "No results.",
  invalid,
  describedBy,
}: {
  id: string
  name: string
  groups: SelectGroup[]
  defaultValue: string
  placeholder?: string
  searchPlaceholder?: string
  emptyMessage?: string
  invalid?: boolean
  describedBy?: string
}) {
  const [open, setOpen] = useState(false)
  const [value, setValue] = useState(defaultValue)
  const selectedLabel = groups.flatMap((group) => group.options).find((option) => option.value === value)?.label

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <input type="hidden" name={name} value={value} />
      <PopoverTrigger asChild>
        <button
          id={id}
          type="button"
          role="combobox"
          aria-expanded={open}
          aria-controls={`${id}-options`}
          aria-invalid={invalid}
          aria-describedby={describedBy}
          className="flex h-9 w-full items-center justify-between gap-2 rounded-md border border-input bg-transparent px-3 text-left text-sm shadow-xs outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 aria-invalid:border-destructive"
        >
          <span className={cn("truncate", !selectedLabel && "text-muted-foreground")}>{selectedLabel ?? placeholder}</span>
          <ChevronsUpDownIcon className="size-4 shrink-0 opacity-50" aria-hidden />
        </button>
      </PopoverTrigger>
      <PopoverContent id={`${id}-options`} align="start" className="w-(--radix-popover-trigger-width) min-w-64 p-0">
        <Command>
          <CommandInput placeholder={searchPlaceholder} aria-label={searchPlaceholder} />
          <CommandList>
            <CommandEmpty>{emptyMessage}</CommandEmpty>
            {groups.map((group) => (
              <CommandGroup key={group.heading} heading={group.heading}>
                {group.options.map((option) => (
                  <CommandItem
                    key={option.value}
                    // cmdk filters on this text; the value itself is part of it so "America/Lima" matches.
                    value={`${option.label} ${option.value}`}
                    data-checked={option.value === value}
                    onSelect={() => {
                      setValue(option.value)
                      setOpen(false)
                    }}
                  >
                    {option.label}
                  </CommandItem>
                ))}
              </CommandGroup>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
