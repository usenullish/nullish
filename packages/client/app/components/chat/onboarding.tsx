import { Link } from "react-router";
import { Circle, CircleCheck, FileText, Landmark, type LucideIcon, Sparkles } from "lucide-react";
import { cn } from "cn";
import type { Api } from "@usenullish/nullish-schema/server";
import { useOrganization } from "~/context/contexts/organization.context";
import { BankingPath, BillingPath, OrganizationRootPath } from "~/navigation";
import { useActiveConversation } from "~/kit/chat/active-conversation.context";
import { useI18n } from "~/kit/i18n/i18n.context";
import { replacePlaceholders } from "~/kit/i18n/i18n.utils";
import { testId } from "~/kit/tests/test.utils";
import { testIds } from "~/kit/tests/test-ids.constants";

interface OnboardingTask {
  key: string;
  title: string;
  description: string;
  to: string;
  done: boolean;
  locked: boolean;
}

interface OnboardingGroup {
  key: string;
  title: string;
  icon: LucideIcon;
  tasks: OnboardingTask[];
}

export const Onboarding = ({
  state,
}: {
  state: Api["Onboarding"]["Client"]["GetOnboardingResponse"];
}) => {
  const { i18n } = useI18n();
  const organization = useOrganization();
  const { activeConversation } = useActiveConversation();

  const root = OrganizationRootPath.create({ organizationId: organization.id });

  const assistant =
    activeConversation?.organizationId === organization.id
      ? root.toConversation({ conversationId: activeConversation.conversationId })
      : root.to({ path: "/conversations" });

  const billing = BillingPath.create({ organizationId: organization.id });
  const banking = BankingPath.create({ organizationId: organization.id });

  const newClient = billing.to({ path: "/clients/new" });
  const newBankRelation = banking.to({ path: "/new" });

  const groups: OnboardingGroup[] = [
    {
      key: "banking",
      title: i18n.navigation.banking,
      icon: Landmark,
      tasks: [
        {
          key: "bankRelation",
          title: i18n.onboarding.bank_relation_title,
          description: i18n.onboarding.bank_relation_description,
          to: newBankRelation,
          done: state.hasBankRelations,
          locked: false,
        },
      ],
    },
    {
      key: "billing",
      title: i18n.navigation.billing,
      icon: FileText,
      tasks: [
        {
          key: "client",
          title: i18n.onboarding.client_title,
          description: i18n.onboarding.client_description,
          to: newClient,
          done: state.hasClients,
          locked: false,
        },
        {
          key: "invoice",
          title: i18n.onboarding.invoice_title,
          description: i18n.onboarding.invoice_description,
          to: billing.to({ path: "/invoices/new" }),
          done: state.hasInvoices,
          locked: !state.hasClients,
        },
      ],
    },
    {
      key: "assistant",
      title: i18n.navigation.assistant,
      icon: Sparkles,
      tasks: [
        {
          key: "assistant",
          title: i18n.onboarding.assistant_title,
          description: i18n.onboarding.assistant_description,
          to: assistant,
          done: false,
          locked: false,
        },
      ],
    },
  ];

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-8 py-10">
      <div className="flex flex-col gap-2">
        <h2 className="text-2xl font-semibold">{i18n.onboarding.title}</h2>
        <p className="text-sm text-muted-foreground">
          {replacePlaceholders(i18n.onboarding.description, {
            "{organization}": organization.name,
          })}
        </p>
      </div>

      {groups.map(({ key, title, icon: Icon, tasks }) => (
        <section key={key} className="flex flex-col gap-3">
          <h4 className="flex items-center gap-2 text-xs font-medium">
            <Icon className="size-4 text-primary" />
            {title}
          </h4>

          <ul className="ml-2 grid grid-cols-1 gap-3 border-l pl-5 sm:grid-cols-2">
            {tasks.map((task) => (
              <li key={task.key} className="flex">
                <OnboardingCard task={task} />
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
};

const OnboardingCard = ({
  task: { key, title, description, to, done, locked },
}: {
  task: OnboardingTask;
}) => {
  const content = (
    <>
      {done ? (
        <CircleCheck className="size-4 text-primary" />
      ) : (
        <Circle className={cn("size-4", locked ? "text-muted-foreground" : "text-primary")} />
      )}

      <span className="font-medium">{title}</span>

      <span className="text-muted-foreground">{description}</span>
    </>
  );

  const className = "flex w-full flex-col gap-2 p-4 text-xs ring-1 ring-foreground/10";

  if (done || locked) {
    return <div className={cn(className, "text-muted-foreground opacity-60")}>{content}</div>;
  }

  return (
    <Link
      to={to}
      className={cn(className, "transition-colors hover:bg-primary/5 hover:ring-primary")}
      {...testId(`${testIds.onboarding.task}-${key}`)}
    >
      {content}
    </Link>
  );
};
