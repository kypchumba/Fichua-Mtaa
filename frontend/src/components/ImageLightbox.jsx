import { useEffect, useRef } from "react";

// Reuses the original image URL so the browser can apply its regular HTTP cache.
export function ImageLightbox({ src, alt, onClose }) {
  const closeButton = useRef(null);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    const previouslyFocused = document.activeElement;
    document.body.style.overflow = "hidden";
    closeButton.current?.focus();

    function handleKeyDown(event) {
      if (event.key === "Escape") {
        onClose();
      }
      if (event.key === "Tab") {
        event.preventDefault();
        closeButton.current?.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
      previouslyFocused?.focus?.();
    };
  }, [onClose]);

  return (
    <div
      className="image-lightbox-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        className="image-lightbox"
        role="dialog"
        aria-modal="true"
        aria-label="Report image preview"
      >
        <button
          ref={closeButton}
          className="image-lightbox-close"
          type="button"
          onClick={onClose}
          aria-label="Close image preview"
        >
          <span aria-hidden="true">×</span>
        </button>
        <img className="image-lightbox-image" src={src} alt={alt} />
      </section>
    </div>
  );
}
