"use client"

import { useRef, useState } from "react"
import { ChevronDownIcon } from "lucide-react"
import { es } from "react-day-picker/locale"

import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

const dateLabel = new Intl.DateTimeFormat("es-AR", {
  day: "numeric",
  month: "long",
  year: "numeric",
})

function isoToDate(value: string): Date | undefined {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (!match) return undefined
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
  return Number.isNaN(date.getTime()) ? undefined : date
}

function dateToIso(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

function DatePicker({
  id,
  value,
  onChange,
  onBlur,
  invalid,
}: {
  id: string
  value: string
  onChange: (value: string) => void
  onBlur?: () => void
  invalid?: boolean
}) {
  const [open, setOpen] = useState(false)
  const openRef = useRef(false)
  const date = isoToDate(value)
  const endMonth = new Date(new Date().getFullYear() + 5, 11, 1)

  function setPickerOpen(next: boolean) {
    openRef.current = next
    setOpen(next)
    if (!next) onBlur?.()
  }

  return (
    <Popover open={open} onOpenChange={setPickerOpen}>
      <PopoverTrigger
        render={
          <Button
            type="button"
            variant="outline"
            id={id}
            data-empty={!date}
            aria-invalid={invalid || undefined}
            onBlur={() => {
              if (!openRef.current) onBlur?.()
            }}
            className="h-11 w-full justify-between px-3 font-normal data-[empty=true]:text-muted-foreground"
          />
        }
      >
        {date ? dateLabel.format(date) : "Elegí una fecha"}
        <ChevronDownIcon />
      </PopoverTrigger>
      <PopoverContent className="w-auto overflow-hidden p-0" align="start">
        <Calendar
          mode="single"
          selected={date}
          captionLayout="dropdown"
          reverseYears
          defaultMonth={date}
          endMonth={endMonth}
          locale={es}
          onSelect={(next) => {
            onChange(next ? dateToIso(next) : "")
            setPickerOpen(false)
          }}
        />
      </PopoverContent>
    </Popover>
  )
}

export { DatePicker }
