// frontend/src/components/layout/Header.jsx

// 🎯 Importação principal do React para criação de componentes funcionais
import React from 'react';
void React // 📦 Garante que o React seja incluído no bundle, mesmo sem JSX direto neste escopo

// 🎨 Importação de estilos específicos do cabeçalho da aplicação
import '@styles/Header.css';

// 🖼️ Importação do logotipo institucional da DCE (Diretoria de Ciência e Engenharia, por exemplo)
// import dceLogo from '@imgs/dce_logo/dce_logo.png';

/**
 * 📌 Header — Cabeçalho principal da aplicação
 *
 * Componente visual fixo que representa a identidade do sistema.
 * Exibe:
 * - O logotipo da organização (à esquerda)
 * - O nome do sistema de monitoramento (à direita)
 *
 * Este cabeçalho estático pode ser reutilizado em todas as páginas
 * como elemento de branding institucional.
 *
 * @returns {JSX.Element} Elemento <header> com logo e título institucional
 */
export default function Header() {
    return (
        <header className="header">
            {/* 🖼️ Logotipo DCE (imagem SVG/PNG) */}
            {/* <img src={dceLogo} alt="Logo DCE" className="header-logo" /> */}

            {/* 🏷️ Nome do sistema exibido ao lado do logotipo */}
            <span>Monitoramento Ambiental - MT</span>
        </header>
    );
}
