const supabase = require('../config/database');

function calcularProximaDose(horaInicioStr, frequenciaHoras) {
  const agora = new Date();
  const [horas, minutos] = horaInicioStr.split(':').map(Number);
  
  let proximaDose = new Date(agora);
  proximaDose.setHours(horas, minutos, 0, 0);

  // Garante que o agendamento será sempre no futuro
  while (proximaDose <= agora) {
    proximaDose.setHours(proximaDose.getHours() + frequenciaHoras);
  }
  return proximaDose;
}

exports.agendarLembrete = async (req, res) => {
  try {
    const { id_paciente } = req.body; // ID enviado pelo app/cron
    const id = id_paciente || 1;

    // 1. Buscar o paciente e seu token da Amazon
    const { data: pacienteData, error: errPaciente } = await supabase
        .from('paciente').select('*').eq('id_paciente', id).single();
        
    if (errPaciente || !pacienteData || !pacienteData.amazon_refresh_token) {
        return res.status(400).json({ error: "Paciente não possui conta Amazon vinculada." });
    }

    // 2. Trocar o refresh_token por um access_token novo
    const tokenResponse = await fetch('https://api.amazon.com/auth/o2/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
            grant_type: 'refresh_token',
            refresh_token: pacienteData.amazon_refresh_token,
            client_id: process.env.AMAZON_CLIENT_ID,
            client_secret: process.env.AMAZON_CLIENT_SECRET
        })
    });

    const tokenData = await tokenResponse.json();
    if (tokenData.error) {
        return res.status(401).json({ error: "Falha ao renovar token da Amazon." });
    }

    const apiAccessToken = tokenData.access_token;
    const apiEndpoint = 'https://api.amazonalexa.com'; // Padrão BR

    // 3. Buscar o medicamento
    const { data, error } = await supabase.from('medicamento').select('*').eq('id_paciente', id);
    if (error) throw error;

    if (!data || data.length === 0) {
      return res.status(404).json({ error: "Você não possui medicamentos cadastrados." });
    }

    const med = data[0];
    
    let dataAgendamento;
    if (med.hora_inicio) {
      dataAgendamento = calcularProximaDose(med.hora_inicio, med.frequencia_horas);
    } else {
      dataAgendamento = new Date(Date.now() + 60000);
    }

    const yyyy = dataAgendamento.getFullYear();
    const mm = String(dataAgendamento.getMonth() + 1).padStart(2, '0');
    const dd = String(dataAgendamento.getDate()).padStart(2, '0');
    const hh = String(dataAgendamento.getHours()).padStart(2, '0');
    const min = String(dataAgendamento.getMinutes()).padStart(2, '0');
    const ss = String(dataAgendamento.getSeconds()).padStart(2, '0');
    
    const timeParaAlexa = `${yyyy}-${mm}-${dd}T${hh}:${min}:${ss}`;

    const reminderPayload = {
      requestTime: new Date().toISOString(),
      trigger: {
        type: "SCHEDULED_ABSOLUTE",
        scheduledTime: timeParaAlexa,
        timeZoneId: "America/Sao_Paulo"
      },
      alertInfo: {
        spokenInfo: {
          content: [{ locale: "pt-BR", text: `Atenção: É hora de tomar seu medicamento ${med.nome_farmaco}, dosagem de ${med.dosagem}.` }]
        }
      },
      pushNotification: { status: "ENABLED" }
    };

    const response = await fetch(`${apiEndpoint}/v1/alerts/reminders`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiAccessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(reminderPayload)
    });

    if (response.status === 403) {
      return res.json({ version: "1.0", response: { outputSpeech: { type: "PlainText", text: "Abra o app da Alexa e dê permissão de lembretes." }, card: { type: "AskForPermissionsConsent", permissions: ["alexa::alerts:reminders:skill:readwrite"] }, shouldEndSession: true } });
    }

    return res.json({
      version: "1.0",
      response: {
        outputSpeech: {
          type: "PlainText",
          text: `Lembrete agendado com sucesso para o medicamento ${med.nome_farmaco}. A próxima dose será às ${hh} horas e ${min} minutos.`
        },
        shouldEndSession: true
      }
    });

  } catch (err) {
    console.error("Erro no servidor:", err);
    return res.json({ version: "1.0", response: { outputSpeech: { type: "PlainText", text: "Erro ao agendar lembrete." }, shouldEndSession: true } });
  }
};
