import { useState } from "react"

export const CUSTOM_CADRE_OPTION = "__custom__"
export const NONE_CADRE_OPTION = "__none__"

interface UseStudentCadreOptions {
  initialIsCadre?: boolean
  initialCadrePosition?: string
  initialCustomPosition?: string
  defaultCadrePosition: string
}

export function useStudentCadre({
  initialIsCadre = false,
  initialCadrePosition = "",
  initialCustomPosition = "",
  defaultCadrePosition,
}: UseStudentCadreOptions) {
  const [isCadre, setIsCadre] = useState(initialIsCadre)
  const [cadreMode, setCadreMode] = useState<"preset" | "custom">(
    initialCustomPosition ? "custom" : "preset"
  )
  const [cadrePosition, setCadrePosition] = useState(initialCadrePosition)
  const [customPosition, setCustomPosition] = useState(initialCustomPosition)

  const resetCadre = () => {
    setIsCadre(false)
    setCadreMode("preset")
    setCadrePosition("")
    setCustomPosition("")
  }

  const applyCadre = ({
    isCadre,
    cadrePosition,
    customPosition,
  }: {
    isCadre: boolean
    cadrePosition?: string
    customPosition?: string
  }) => {
    setIsCadre(isCadre)
    setCadrePosition(cadrePosition || "")
    setCustomPosition(customPosition || "")
    setCadreMode(customPosition ? "custom" : "preset")
  }

  const handleCadreChange = (value: string) => {
    if (value === NONE_CADRE_OPTION) {
      resetCadre()
      return
    }

    setIsCadre(true)

    if (value === CUSTOM_CADRE_OPTION) {
      setCadreMode("custom")
      setCadrePosition("")
      return
    }

    setCadreMode("preset")
    setCadrePosition(value)
    setCustomPosition("")
  }

  const handleCustomPositionChange = (value: string) => {
    setCustomPosition(value)
    if (value) {
      setIsCadre(true)
      setCadreMode("custom")
      setCadrePosition("")
    }
  }

  const currentCadreValue = !isCadre
    ? NONE_CADRE_OPTION
    : cadreMode === "custom"
      ? CUSTOM_CADRE_OPTION
      : cadrePosition || defaultCadrePosition

  return {
    isCadre,
    setIsCadre,
    cadreMode,
    cadrePosition,
    customPosition,
    setCadreMode,
    setCadrePosition,
    setCustomPosition,
    resetCadre,
    applyCadre,
    handleCadreChange,
    handleCustomPositionChange,
    currentCadreValue,
  }
}
