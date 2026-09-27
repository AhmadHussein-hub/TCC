import 'package:flutter/material.dart';

class AlertaOmissaoDialog extends StatelessWidget {
  final String patientName;
  final String medicationName;
  final String scheduledTime;

  const AlertaOmissaoDialog({
    super.key,
    required this.patientName,
    required this.medicationName,
    required this.scheduledTime,
  });

  @override
  Widget build(BuildContext context) {
    return Dialog(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      elevation: 0,
      backgroundColor: Colors.transparent,
      child: Container(
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(16),
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            // Header Vermelho
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(16),
              decoration: const BoxDecoration(
                color: Color(0xFFDC2626), // Vermelho Urgente
                borderRadius: BorderRadius.vertical(top: Radius.circular(16)),
              ),
              child: Stack(
                alignment: Alignment.center,
                children: [
                  const Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(Icons.warning_amber_rounded, color: Colors.white, size: 28),
                      SizedBox(width: 8),
                      Text(
                        'URGENTE\nALERTA DE OMISSÃO',
                        textAlign: TextAlign.center,
                        style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 16),
                      ),
                    ],
                  ),
                  Positioned(
                    right: 0,
                    child: IconButton(
                      icon: const Icon(Icons.close, color: Colors.white),
                      onPressed: () => Navigator.of(context).pop(),
                    ),
                  ),
                ],
              ),
            ),
            
            // Corpo do Alerta
            Padding(
              padding: const EdgeInsets.all(20),
              child: Column(
                children: [
                  // Caixa Rosa Claro
                  Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: const Color(0xFFFEF2F2),
                      border: Border.all(color: const Color(0xFFFECACA)),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        RichText(
                          text: TextSpan(
                            style: const TextStyle(color: Color(0xFF7F1D1D), fontSize: 14, height: 1.5),
                            children: [
                              const TextSpan(text: 'O '),
                              TextSpan(text: patientName, style: const TextStyle(fontWeight: FontWeight.bold)),
                              const TextSpan(text: ' não confirmou a ingestão de\n'),
                              TextSpan(text: medicationName, style: const TextStyle(fontWeight: FontWeight.bold)),
                              TextSpan(text: ' às $scheduledTime.'),
                            ],
                          ),
                        ),
                        const SizedBox(height: 12),
                        const Text(
                          'Tolerância de 30 min excedida — sem resposta à Alexa',
                          style: TextStyle(color: Color(0xFFDC2626), fontSize: 12, fontWeight: FontWeight.w600),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 24),
                  
                  // Botões de Ação
                  ElevatedButton.icon(
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFFDC2626), // Botão Vermelho
                    ),
                    icon: const Icon(Icons.phone),
                    label: const Text('Ligar para Paciente'),
                    onPressed: () {
                      // Lógica de ligação nativa
                    },
                  ),
                  const SizedBox(height: 12),
                  OutlinedButton.icon(
                    style: OutlinedButton.styleFrom(
                      side: const BorderSide(color: Color(0xFF10B981)), // Borda Verde
                      minimumSize: const Size(double.infinity, 54),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    ),
                    icon: const Icon(Icons.check_circle_outline, color: Color(0xFF10B981)),
                    label: const Text(
                      'Marcar como Tomado manualmente',
                      style: TextStyle(color: Color(0xFF065F46), fontWeight: FontWeight.bold),
                    ),
                    onPressed: () {
                      // Lógica de atualização no Supabase
                      Navigator.of(context).pop();
                    },
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}