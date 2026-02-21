import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // ── Users ──
  const passwordHash = await bcrypt.hash('admin123', 10);

  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@firma.com' },
    update: {},
    create: {
      email: 'admin@firma.com',
      display_name: 'Administrador Sistema',
      role: 'ADMIN',
      department: 'Control Interno',
      password_hash: passwordHash,
    },
  });

  const ownerUser = await prisma.user.upsert({
    where: { email: 'responsable@firma.com' },
    update: {},
    create: {
      email: 'responsable@firma.com',
      display_name: 'Ana García',
      role: 'OWNER',
      department: 'Control Interno',
      password_hash: passwordHash,
    },
  });

  console.log('Users created:', adminUser.email, ownerUser.email);

  // ── Evidence Templates ──
  const templates = await Promise.all([
    prisma.evidenceTemplate.create({
      data: {
        name: 'Balance Anual',
        category: 'Financiero',
        type: 'EXCEL',
        default_instructions: 'Por favor, adjunte el balance anual del ejercicio correspondiente en formato Excel.',
        is_global: true,
      },
    }),
    prisma.evidenceTemplate.create({
      data: {
        name: 'Acta de Reunión',
        category: 'Governance',
        type: 'PDF',
        default_instructions: 'Adjunte el acta de la reunión firmada en formato PDF.',
        is_global: true,
      },
    }),
    prisma.evidenceTemplate.create({
      data: {
        name: 'Captura de Acceso a Plataforma',
        category: 'IT',
        type: 'SCREENSHOT',
        default_instructions: 'Adjunte una captura de pantalla que demuestre el acceso a la plataforma indicada.',
        is_global: true,
      },
    }),
  ]);

  console.log('Evidence templates created:', templates.length);

  // ── Sample Campaign ──
  const campaign = await prisma.campaign.create({
    data: {
      name: 'Revisión Anual de Controles HR 2026',
      control_code: 'HR-FCTRL-1',
      description: 'Campaña de recopilación de evidencias para los controles de RRHH del ejercicio 2026.',
      owner_user_id: ownerUser.user_id,
      backup_user_id: adminUser.user_id,
      start_date: new Date('2026-03-01'),
      end_date: new Date('2026-04-30'),
      reminder_policy: {
        frequency_days: 3,
        max_reminders: 5,
        start_after_days: 2,
      },
      escalation_policy: {
        levels: [
          { level: 1, after_reminders: 0, cc_delegate: false, cc_superior: false },
          { level: 2, after_reminders: 2, cc_delegate: true, cc_superior: false },
          { level: 3, after_reminders: 4, cc_delegate: true, cc_superior: true, superior_email: 'socio@firma.com' },
        ],
      },
      email_template: '<p>Estimado/a {{recipient_name}},</p><p>Le solicitamos la documentación indicada a continuación para el control <strong>{{control_code}}</strong>.</p><p>Acceda mediante el siguiente enlace: <a href="{{access_url}}">Acceder a la solicitud</a></p><p>Fecha límite: {{deadline}}</p>',
      status: 'DRAFT',
    },
  });

  console.log('Sample campaign created:', campaign.name);

  // ── Sample Requests ──
  const request1 = await prisma.request.create({
    data: {
      campaign_id: campaign.campaign_id,
      recipient_email: 'jgarcia@firma.com',
      recipient_name: 'Juan García',
      cc_emails: ['delegado@firma.com'],
      delegate_email: 'delegado@firma.com',
      deadline: new Date('2026-04-15'),
      status: 'DRAFT',
      evidence_items: {
        create: [
          {
            name: 'Balance Anual 2025',
            type: 'EXCEL',
            is_mandatory: true,
            instructions: 'Adjunte el balance anual del ejercicio 2025.',
            template_id: templates[0].template_id,
          },
          {
            name: 'Acta Reunión Comité HR Diciembre',
            type: 'PDF',
            is_mandatory: true,
            instructions: 'Adjunte el acta de la reunión del comité de RRHH de diciembre 2025.',
            template_id: templates[1].template_id,
          },
          {
            name: 'Captura Acceso SAP HR',
            type: 'SCREENSHOT',
            is_mandatory: false,
            instructions: 'Captura de pantalla mostrando acceso al módulo HR de SAP.',
            template_id: templates[2].template_id,
          },
        ],
      },
    },
  });

  const request2 = await prisma.request.create({
    data: {
      campaign_id: campaign.campaign_id,
      recipient_email: 'mlopez@firma.com',
      recipient_name: 'María López',
      deadline: new Date('2026-04-15'),
      status: 'DRAFT',
      evidence_items: {
        create: [
          {
            name: 'Balance Anual 2025',
            type: 'EXCEL',
            is_mandatory: true,
            instructions: 'Adjunte el balance anual del ejercicio 2025.',
            template_id: templates[0].template_id,
          },
        ],
      },
    },
  });

  console.log('Sample requests created:', request1.request_id, request2.request_id);

  // ── Audit Log entry ──
  await prisma.auditLog.create({
    data: {
      entity_type: 'CAMPAIGN',
      entity_id: campaign.campaign_id,
      action: 'CAMPAIGN_CREATED',
      actor_email: ownerUser.email,
      details: { source: 'seed' },
      campaign_id: campaign.campaign_id,
    },
  });

  console.log('Seed completed successfully.');
}

main()
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
