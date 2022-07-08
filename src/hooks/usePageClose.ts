import { useEffect } from "react"

export function usePageClose(): void {
    function handler(e: Event) {
        e.preventDefault()
        e.returnValue = false
        return false
    }
    useEffect(() => {
       window.addEventListener("beforeunload", handler)
       return () => {
        window.removeEventListener("beforeunload", handler)
       }
    },[])
}