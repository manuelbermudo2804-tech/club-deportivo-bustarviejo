// Validadores de formato para formularios

export const validators = {
  // Valida DNI/NIE español
  dni: (value) => {
    if (!value) return { valid: true };
    
    const dniRegex = /^[0-9]{8}[A-Z]$/;
    const nieRegex = /^[XYZ][0-9]{7}[A-Z]$/;
    
    const cleanValue = value.toUpperCase().replace(/[\s-]/g, '');
    
    if (!dniRegex.test(cleanValue) && !nieRegex.test(cleanValue)) {
      return { valid: false, error: "Formato incorrecto. Ejemplo: 12345678A o X1234567A" };
    }
    
    // Validar letra del DNI
    const letters = 'TRWAGMYFPDXBNJZSQVHLCKE';
    let number = cleanValue.substring(0, 8);
    
    // Si es NIE, convertir primera letra
    if (nieRegex.test(cleanValue)) {
      const nieMap = { 'X': '0', 'Y': '1', 'Z': '2' };
      number = nieMap[cleanValue[0]] + cleanValue.substring(1, 8);
    }
    
    const expectedLetter = letters[parseInt(number) % 23];
    const providedLetter = cleanValue[8];
    
    if (expectedLetter !== providedLetter) {
      return { valid: false, error: "La letra del DNI/NIE no es correcta" };
    }
    
    return { valid: true };
  },

  // Valida teléfono español
  telefono: (value) => {
    if (!value) return { valid: true };
    
    const cleanValue = value.replace(/[\s-]/g, '');
    
    // Móvil español: 6XX XXX XXX o 7XX XXX XXX
    // Fijo: 9XX XXX XXX o 8XX XXX XXX
    const mobileRegex = /^[67]\d{8}$/;
    const landlineRegex = /^[89]\d{8}$/;
    
    if (!mobileRegex.test(cleanValue) && !landlineRegex.test(cleanValue)) {
      return { valid: false, error: "Formato incorrecto. Ejemplo: 612345678 o 912345678" };
    }
    
    return { valid: true };
  },

  // Valida email
  email: (value) => {
    if (!value) return { valid: true };
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    
    if (!emailRegex.test(value)) {
      return { valid: false, error: "Email no válido. Ejemplo: usuario@ejemplo.com" };
    }

    // Detectar typos en dominios comunes
    const typoCheck = validators.emailDomainTypo(value);
    if (typoCheck.suggestion) {
      return { valid: false, error: typoCheck.error, suggestion: typoCheck.suggestion };
    }
    
    return { valid: true };
  },

  // Detecta typos en dominios de email comunes
  emailDomainTypo: (value) => {
    if (!value) return { suggestion: null };
    const domain = value.split("@")[1]?.toLowerCase();
    if (!domain) return { suggestion: null };

    const KNOWN_DOMAINS = {
      "gmail.com": ["gamil.com","gmal.com","gmial.com","gmaill.com","gmail.con","gmail.es","gnail.com","gmali.com","gmai.com","gmail.co","gmil.com","gimail.com","gemail.com","gmail.om","gmaol.com","gmailcom","gmeil.com","gmqil.com"],
      "hotmail.com": ["hotmal.com","hotmai.com","hotmial.com","hotamil.com","hotmaill.com","hotmail.con","hotmil.com","hotmeil.com","homail.com","hotmaol.com","hotmali.com","hotmail.es","hotmailcom","htmail.com","hotmall.com"],
      "hotmail.es": ["hotmal.es","hotmai.es","hotmial.es","hotamil.es","homail.es","hotmil.es"],
      "yahoo.com": ["yaho.com","yahooo.com","yhoo.com","yaoo.com","yahoo.con","yahho.com","yhaoo.com","yahocom"],
      "yahoo.es": ["yaho.es","yahooo.es","yhoo.es","yaoo.es"],
      "outlook.com": ["outlok.com","outllook.com","outlookk.com","outook.com","outlook.con","outloock.com","outlookcom"],
      "outlook.es": ["outlok.es","outllook.es","outook.es"],
      "icloud.com": ["iclud.com","iclould.com","icoud.com","icloud.con","icloudcom"],
      "live.com": ["live.con","lve.com","livee.com"],
    };

    for (const [correct, typos] of Object.entries(KNOWN_DOMAINS)) {
      if (typos.includes(domain)) {
        const corrected = value.split("@")[0] + "@" + correct;
        return { suggestion: corrected, error: `¿Quisiste decir ${corrected}? (has escrito "@${domain}")` };
      }
    }
    return { suggestion: null };
  },

  // Valida IBAN español
  iban: (value) => {
    if (!value) return { valid: true };
    
    const cleanValue = value.replace(/[\s-]/g, '').toUpperCase();
    
    if (!cleanValue.startsWith('ES')) {
      return { valid: false, error: "Solo se aceptan IBANs españoles (ES...)" };
    }
    
    const ibanRegex = /^ES\d{22}$/;
    
    if (!ibanRegex.test(cleanValue)) {
      return { valid: false, error: "Formato incorrecto. Ejemplo: ES12 1234 1234 1234 1234 1234" };
    }
    
    return { valid: true };
  },

  // Valida código postal español
  codigoPostal: (value) => {
    if (!value) return { valid: true };
    
    const cpRegex = /^(0[1-9]|[1-4]\d|5[0-2])\d{3}$/;
    
    if (!cpRegex.test(value)) {
      return { valid: false, error: "Código postal no válido. Ejemplo: 28001" };
    }
    
    return { valid: true };
  },

  // Valida fecha de nacimiento (mayor de 3 años, menor de 100)
  fechaNacimiento: (value) => {
    if (!value) return { valid: true };
    
    const date = new Date(value);
    const today = new Date();
    const age = today.getFullYear() - date.getFullYear();
    
    if (age < 3) {
      return { valid: false, error: "El jugador debe tener al menos 3 años" };
    }
    
    if (age > 100) {
      return { valid: false, error: "Fecha no válida" };
    }
    
    return { valid: true };
  },

  // Valida número de cuenta bancaria (últimos 4 dígitos)
  ultimos4Digitos: (value) => {
    if (!value) return { valid: true };
    
    const cleanValue = value.replace(/\s/g, '');
    
    if (!/^\d{4}$/.test(cleanValue)) {
      return { valid: false, error: "Deben ser 4 dígitos. Ejemplo: 1234" };
    }
    
    return { valid: true };
  },

  // Valida cantidad de dinero (no negativa, máximo 2 decimales)
  dinero: (value) => {
    if (!value && value !== 0) return { valid: true };
    
    const numValue = parseFloat(value);
    
    if (isNaN(numValue) || numValue < 0) {
      return { valid: false, error: "La cantidad debe ser positiva" };
    }
    
    if (!/^\d+(\.\d{1,2})?$/.test(value.toString())) {
      return { valid: false, error: "Máximo 2 decimales. Ejemplo: 150.50" };
    }
    
    return { valid: true };
  }
};

// Formatea valores automáticamente
export const formatters = {
  dni: (value) => {
    return value.toUpperCase().replace(/[\s-]/g, '').substring(0, 9);
  },

  telefono: (value) => {
    const cleaned = value.replace(/\D/g, '');
    if (cleaned.length <= 9) {
      return cleaned;
    }
    return cleaned.substring(0, 9);
  },

  iban: (value) => {
    const cleaned = value.toUpperCase().replace(/[\s-]/g, '');
    // Formatear en grupos de 4
    return cleaned.match(/.{1,4}/g)?.join(' ') || cleaned;
  },

  codigoPostal: (value) => {
    return value.replace(/\D/g, '').substring(0, 5);
  },

  dinero: (value) => {
    // Permitir solo números y un punto decimal
    return value.replace(/[^\d.]/g, '').replace(/(\..*)\./g, '$1');
  }
};