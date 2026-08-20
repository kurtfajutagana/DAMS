import AuthModal from "./AuthModal";

export default function SignupModal({ isOpen, onClose }) {
  return <AuthModal isOpen={isOpen} initialMode="signup" onClose={onClose} />;
}
