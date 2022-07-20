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
          className="fixed w-screen h-screen top-0 left-0 opacity-40 z-30"
          style={{ background: 'rgba(0,0,0,0.8)' }}
          onClick={() => onClose?.()}
        ></div>
      ) : null}
      {/* dialog must append to body. The polyfill not work in safari if dialog's parent element not body.  */}
      {ReactDom.createPortal(
        <dialog
          open={visible}
          ref={(el) => (dialogRef.current = el as TDialogElement)}
          className={`z-20 fixed rounded-lg border border-black ${dialogClass}`}
          style={{ transform: ' translate(0, -50%)', ...dialogStyle }}
        >
          {children}
        </dialog>,
        document.body
      )}
    </>
  )
}
