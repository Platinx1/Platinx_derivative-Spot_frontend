import logo from "../../assets/logo.png";
import profile from "../../assets/profile-new.jpg";
// import profile from "../../assets/profile.jpg";

import {
  Menu,
  ChevronDown,
  Wallet,
  Users,
  Shield,
  Ticket,
  Building2,
  User,
  UserCheck,
  LogOut,
} from "lucide-react";

export default function Header() {
  return (
    <nav className="w-full bg-[#070B14] text-white border-b border-white/10">
      <div className="mx-auto px-3 sm:px-5 lg:px-2">
        <div className="flex items-center justify-between h-[62px] lg:h-20">
          {/* Logo */}
          <div
            className="flex items-center cursor-pointer shrink-0"
            onClick={() => window.open("https://platinx.exchange/", "_blank")}
          >
            <img
              src={logo}
              alt="PlatinX Logo"
              className="w-[110px] sm:w-[150px] md:w-[170px] lg:w-[150px] h-auto object-contain"
            />
          </div>

          {/* Desktop Menu */}
          <div className="hidden lg:flex items-center gap-7 xl:gap-10 text-[16px] font-[400] uppercase tracking-[0.5px] text-white ml-auto transition-all duration-400">
            <NavItem
              icon={<i className="fas fa-tachometer-alt"></i>}
              title="Dashboard"
              href="https://platinx.exchange/exc/dashboard"
            />

            {/* Exchange Dropdown */}
            <div className="relative group">
              <div className="flex items-center gap-2 cursor-pointer hover:text-white transition duration-300">
                <i className="fas fa-exchange-alt"></i>
                <div className="flex items-center gap-1">
                  <span>Exchange</span>
                  <ChevronDown size={14} />
                </div>
              </div>
              <DropdownMenu>
                <DropdownItem title="FUTURES INR" href="/futures" />
                <DropdownItem
                  title="SPOT INR"
                  href="/spot"
                />

              </DropdownMenu>
            </div>

            {/* Wallet */}
            <div className="relative group">
              <div className="flex items-center gap-2 cursor-pointer hover:text-white transition duration-300">
                <Wallet size={14} />
                <div className="flex items-center gap-1">
                  <span>Wallet</span>
                  <ChevronDown size={16} />
                </div>
              </div>
              <DropdownMenu>
                <DropdownItem
                  title="WALLET"
                  href="https://platinx.exchange/exc/wallet"
                />
                <DropdownItem
                  title="WITHDRAW INR"
                  href="https://platinx.exchange/exc/withdraw"
                />
                <DropdownItem
                  title="DEPOSIT INR"
                  href="https://platinx.exchange/exc/depositform"
                />
                <DropdownItem
                  title="TRANSFER"
                  href="https://platinx.exchange/exc/transfer"
                />
              </DropdownMenu>
            </div>

            {/* Referral */}
            <div className="relative group">
              <div className="flex items-center gap-2 cursor-pointer hover:text-white transition duration-300">
                <Users size={16} />
                <div className="flex items-center gap-1">
                  <span>Referral</span>
                  <ChevronDown size={16} />
                </div>
              </div>
              <DropdownMenu>
                <DropdownItem
                  title="REFERRAL"
                  href="https://platinx.exchange/exc/referral"
                />
                <DropdownItem
                  title="REFERRAL USERS"
                  href="https://platinx.exchange/exc/ReferralUsers"
                />
              </DropdownMenu>
            </div>

            <NavItem
              icon={<i className="fas fa-history"></i>}
              title="Order History"
              href="https://platinx.exchange/exc/order-History"
            />
          </div>

          {/* Right Side */}
          <div className="flex items-center gap-2 sm:gap-4 ml-3">
            {/* Profile Dropdown */}
            <div className="relative group">
              <div className="flex items-center gap-1.5 cursor-pointer hover:opacity-80 transition duration-300 group">
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full border border-violet-400/30 bg-violet-600 flex items-center justify-center">
                  <User size={20} className="text-white" />
                </div>

                <ChevronDown
                  size={16}
                  className="text-white/70 group-hover:text-white transition-colors"
                />
              </div>

              <DropdownMenu className="right-0">
                <DropdownItem
                  title="CoinList"
                  href="https://platinx.exchange/exc/coinList"
                  icon={<Wallet size={16} />}
                />
                <DropdownItem
                  title="Security"
                  href="https://platinx.exchange/exc/security"
                  icon={<Shield size={16} />}
                />
                <DropdownItem
                  title="Tickets"
                  href="https://platinx.exchange/exc/ticket"
                  icon={<Ticket size={16} />}
                />
                <DropdownItem
                  title="Bank Details"
                  href="https://platinx.exchange/exc/bankDetails"
                  icon={<Building2 size={16} />}
                />
                <DropdownItem
                  title="My Profile"
                  href="https://platinx.exchange/exc/Profile"
                  icon={<User size={16} />}
                />
                <DropdownItem
                  title="KYC"
                  href="https://platinx.exchange/exc/setting"
                  icon={<UserCheck size={16} />}
                />
                <DropdownItem
                  title="Log Out"
                  href="https://platinx.exchange/exc/dashboard"
                  icon={<LogOut size={16} />}
                />
              </DropdownMenu>
            </div>

            {/* Mobile Menu */}
            <div className="lg:hidden">
              <details className="relative">
                <summary className="list-none cursor-pointer">
                  <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-white/10 flex items-center justify-center">
                    <Menu size={22} />
                  </div>
                </summary>

                <div className="absolute right-0 mt-3 w-[260px] bg-[#151d2e] border border-white/10 rounded-2xl shadow-2xl p-4 z-50">
                  <div className="flex flex-col gap-2 text-sm uppercase">
                    <MobileItem
                      title="Dashboard"
                      href="https://platinx.exchange/exc/dashboard"
                    />
                    <MobileItem title="Futures" href="/futures" />
                    <MobileItem
                      title="Wallet"
                      href="https://platinx.exchange/exc/wallet"
                    />
                    <MobileItem
                      title="Deposit"
                      href="https://platinx.exchange/exc/depositform"
                    />
                    <MobileItem
                      title="Withdraw"
                      href="https://platinx.exchange/exc/withdraw"
                    />
                    <MobileItem
                      title="Transfer"
                      href="https://platinx.exchange/exc/transfer"
                    />
                    <MobileItem
                      title="Referral"
                      href="https://platinx.exchange/exc/referral"
                    />
                    <MobileItem
                      title="Referral Users"
                      href="https://platinx.exchange/exc/ReferralUsers"
                    />
                    <MobileItem
                      title="Order History"
                      href="https://platinx.exchange/exc/order-History"
                    />
                  </div>
                </div>
              </details>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}

/* ==================== Dropdown Menu ==================== */
function DropdownMenu({ children, className = "" }) {
  return (
    <div
      className={`absolute top-full mt-4 min-w-[200px] bg-[#070B14] border border-white/10 
                  rounded shadow-[0_0_0_1px_rgba(255,255,255,0.2),0_0_25px_rgba(255,255,255,0.25)] 
                  opacity-0 invisible group-hover:opacity-100 group-hover:visible 
                  transition-all duration-300 z-50 overflow-hidden ${className}`}
    >
      <div className="py-1 flex flex-col">{children}</div>
    </div>
  );
}

/* ==================== Dropdown Item with Icon ==================== */
function DropdownItem({ title, href, icon }) {
  return (
    <a
      href={href}
      className="px-5 py-3 text-[14px] font-medium tracking-wider hover:bg-[#5F0099] transition-all duration-200 flex items-center gap-3 border-b border-white/5 last:border-none"
    >
      {icon && <span className="text-white">{icon}</span>}
      <span>{title}</span>
    </a>
  );
}

/* ==================== Nav Item ==================== */
function NavItem({ icon, title, href }) {
  return (
    <a
      href={href || "#"}
      className="flex items-center gap-2 cursor-pointer hover:text-white transition duration-300 whitespace-nowrap"
    >
      <span className="text-base flex items-center">{icon}</span>
      <span>{title}</span>
    </a>
  );
}

/* ==================== Mobile Item ==================== */
function MobileItem({ title, href }) {
  return (
    <a
      href={href || "#"}
      className="text-left px-3 py-3 rounded hover:bg-white/10 transition duration-300 block"
    >
      {title}
    </a>
  );
}