import dialogPolyfill from 'dialog-polyfill'
import { useEffect, useRef } from 'react'
import ReactDom from 'react-dom'
interface TDialogElement extends HTMLDialogElement {
  showModal: () => void
  close: () => void
}

interface TDialogProps {
  visible: boolean
  children: React.ReactNode
  dialogStyle?: React.CSSProperties
  dialogClass?: string
  onClose?: () => void
}

export function Dialog(props: TDialogProps) {
  const { children, visible, onClose, dialogStyle, dialogClass } = props
  const dialogRef = useRef<TDialogElement | null>(null)

  // polyfill for dialog
  // more see https://github.com/GoogleChrome/dialog-polyfill
  useEffect(() => {
    if (dialogRef.current && typeof dialogRef.current !== 'function') {
      dialogPolyfill.registerDialog(dialogRef.current as TDialogElement)
    }
  }, [dialogRef.current])

  return (
    <>
      {visible ? (
        <div
          className="fixed w-screen h-screen top-0 left-0 z-50"
          style={{ backdropFilter: "blur(6px)", }}
          onClick={() => onClose?.()}
        ></div>
      ) : null}
      {/* dialog must append to body. The polyfill not work in safari if dialog's parent element not body.  */}
      {ReactDom.createPortal(
        <dialog
          open={visible}
          ref={(el) => (dialogRef.current = el as TDialogElement)}
          className={`z-50 fixed rounded-lg border border-black overflow-y-auto dark:bg-slate-800 dark:text-white ${dialogClass}`}
          style={{
            transform: 'translate(0, -50%)',
            maxHeight: '70%',
            backdropFilter: "blur(6px)",
            ...dialogStyle,
          }}
        >
          {children}
        </dialog>,
        document.body
      )}
    </>
  )
}
