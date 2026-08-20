import AuthModal from "./AuthModal";

export default function LoginModal({ isOpen, onClose }) {
  return <AuthModal isOpen={isOpen} initialMode="login" onClose={onClose} />;
}
